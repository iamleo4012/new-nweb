/**
 * lib/online-stock.ts — the website's ONLINE STORE stock rules.
 *
 * Architecture context (spec: SUPERADMIN / OWNER + ONLINE STORE EXTENSION):
 *   - This website is an additional ONLINE SALES CHANNEL. The physical-store
 *     ERP is a separate system and is never touched here.
 *   - `Product.stock` IS the manually-allocated online-store quantity (the
 *     admin enters it per product; it is intentionally NOT synchronised with
 *     the ERP's physical inventory). No second inventory field/table exists.
 *
 * Behaviour implemented here:
 *   1. ORDER PLACEMENT  — atomically validate + deduct online stock inside
 *      the order-creation transaction. Two customers racing for the last
 *      unit cannot both succeed: the conditional UPDATE takes a row lock,
 *      so the loser's predicate re-evaluates after the winner commits.
 *   2. ORDER DECLINED / CANCELLED — restore the exact per-product quantities
 *      reserved by that order, exactly once.
 *   3. ITEMS REMOVED AFTER CONFIRMATION (UNAVAILABLE → REMOVED_...) — their
 *      reserved units are restored at removal time; a later whole-order
 *      restore skips them so units are never returned twice.
 *
 * Exactly-once guarantee: `StockMovement` rows are the reservation ledger
 * (note = orderNumber). Restoration is derived as reserved − alreadyRestored
 * per product, so even a hypothetical double-invocation restores nothing the
 * second time. Orders placed before this system existed have no ledger rows
 * and are therefore never "restored" (stock would otherwise be invented).
 *
 * Audit: every mutation writes a human-readable AuditLog entry reusing the
 * existing table (no duplicate audit system).
 */
import type { Prisma, OrderItem } from "@prisma/client";
import { prisma } from "@/lib/db";

type Tx = Prisma.TransactionClient;

export const RESERVE_REASON = "ONLINE_ORDER_RESERVATION";
export const DECLINE_RESTORE_REASON = "ORDER_DECLINED_RESTORE";
export const CANCEL_RESTORE_REASON = "ORDER_CANCELLED_RESTORE";
export const ITEM_REMOVED_RESTORE_REASON = "ORDER_ITEM_REMOVED_RESTORE";

/** Thrown inside the order transaction when online stock is insufficient. */
export class InsufficientStockError extends Error {
  constructor(
    public productName: string,
    public requested: number,
    public available: number
  ) {
    super(`Not enough online stock for "${productName}" — only ${available} available online.`);
    this.name = "InsufficientStockError";
  }
}

export interface ReserveItemInput {
  productId: number;
  name: string;
  quantity: number;
}

/**
 * Deduct (reserve) online stock for every item of a new order.
 * MUST run inside the order-creation transaction: either the order and all
 * its reservations commit together, or nothing changes.
 *
 * The conditional `updateMany` (`WHERE stock >= qty`) is the atomic
 * check-and-decrement — concurrent transactions serialise on the row lock,
 * so the last unit can only ever be sold once.
 */
export async function reserveOnlineStock(
  tx: Tx,
  items: ReserveItemInput[],
  orderNumber: string
): Promise<void> {
  // Aggregate duplicate product lines so each product row is touched once.
  const qtyByProduct = new Map<number, { name: string; qty: number }>();
  for (const item of items) {
    const cur = qtyByProduct.get(item.productId);
    if (cur) cur.qty += item.quantity;
    else qtyByProduct.set(item.productId, { name: item.name, qty: item.quantity });
  }

  for (const [productId, { name, qty }] of qtyByProduct) {
    const deducted = await tx.product.updateMany({
      where: { id: productId, stock: { gte: qty } },
      data: { stock: { decrement: qty } },
    });
    if (deducted.count === 0) {
      const current = await tx.product.findUnique({ where: { id: productId }, select: { stock: true } });
      throw new InsufficientStockError(name, qty, current?.stock ?? 0);
    }
    await tx.stockMovement.create({
      data: { productId, delta: -qty, reason: RESERVE_REASON, note: orderNumber },
    });
    await tx.auditLog.create({
      data: {
        action: "ONLINE_STOCK_RESERVATION",
        entity: "Product",
        entityId: String(productId),
        detail: `order ${orderNumber}; reserved ${qty}; online stock reduced by ${qty}`,
      },
    });
  }
}

/**
 * Per-product outstanding reservation for an order:
 *   reserved (from ONLINE_ORDER_RESERVATION ledger rows)
 *   minus units already restored by any earlier *_RESTORE rows.
 * This is the single source of "how much may still be returned".
 */
async function outstandingReservation(tx: Tx, orderNumber: string): Promise<Map<number, number>> {
  const movements = await tx.stockMovement.findMany({
    where: { note: orderNumber },
    select: { productId: true, delta: true, reason: true },
  });
  const outstanding = new Map<number, number>();
  for (const m of movements) {
    if (m.reason === RESERVE_REASON) {
      outstanding.set(m.productId, (outstanding.get(m.productId) ?? 0) + Math.abs(m.delta));
    } else if (m.reason.endsWith("_RESTORE")) {
      outstanding.set(m.productId, (outstanding.get(m.productId) ?? 0) - m.delta);
    }
  }
  for (const [pid, remaining] of outstanding) {
    if (remaining <= 0) outstanding.delete(pid);
  }
  return outstanding;
}

/**
 * Shared restore engine. Increases Product.stock by `wanted` per product,
 * capped at the order's outstanding reservation (exactly-once), writes the
 * restore ledger row and the AuditLog old→new entry.
 */
async function restoreUnits(
  tx: Tx,
  orderNumber: string,
  wantedByProduct: Map<number, number>,
  reason: string,
  note: string
): Promise<number> {
  if (wantedByProduct.size === 0) return 0;
  const outstanding = await outstandingReservation(tx, orderNumber);
  if (outstanding.size === 0) return 0; // legacy order (no reservation) — nothing to restore

  let restoredTotal = 0;
  for (const [productId, wanted] of wantedByProduct) {
    const allowed = Math.min(wanted, outstanding.get(productId) ?? 0);
    if (allowed <= 0) continue;
    const before = await tx.product.findUnique({ where: { id: productId }, select: { stock: true, slug: true } });
    await tx.product.update({ where: { id: productId }, data: { stock: { increment: allowed } } });
    await tx.stockMovement.create({
      data: { productId, delta: allowed, reason, note: orderNumber },
    });
    await tx.auditLog.create({
      data: {
        action: "ONLINE_STOCK_RESTORE",
        entity: "Product",
        entityId: String(productId),
        detail: `order ${orderNumber}; online stock: ${before?.stock ?? "?"} -> ${(before?.stock ?? 0) + allowed}; reason: ${reason}; ${note}`,
      },
    });
    restoredTotal += allowed;
  }
  return restoredTotal;
}

/**
 * Restore online stock for a whole order being declined (CANCELLED_BY_STAFF)
 * or cancelled by the customer (CANCELLED_BY_CUSTOMER).
 *
 * Items already returned via REMOVED_AFTER_CONFIRMATION are skipped — their
 * units were restored when they were removed, never twice.
 * MUST run inside the same transaction as the status transition.
 */
export async function restoreOnlineStockForOrder(
  tx: Tx,
  order: { orderNumber: string; items: Pick<OrderItem, "productId" | "quantity" | "itemStatus">[] },
  reason: typeof DECLINE_RESTORE_REASON | typeof CANCEL_RESTORE_REASON
): Promise<number> {
  const wanted = new Map<number, number>();
  for (const item of order.items) {
    if (item.productId == null) continue;
    if (item.itemStatus === "REMOVED_AFTER_CONFIRMATION") continue; // already restored
    wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + item.quantity);
  }
  return restoreUnits(tx, order.orderNumber, wanted, reason, "whole-order restore");
}

/**
 * Restore the reserved units of specific items at the moment they become
 * REMOVED_AFTER_CONFIRMATION (unavailable items dropped when the order is
 * confirmed). Called from both the admin CONFIRMED transition and the
 * customer confirm route — the transition itself can only happen once, and
 * the ledger cap makes even a repeat call harmless.
 */
export async function restoreStockForRemovedItems(
  tx: Tx,
  orderNumber: string,
  removedItems: Pick<OrderItem, "productId" | "quantity">[]
): Promise<number> {
  const wanted = new Map<number, number>();
  for (const item of removedItems) {
    if (item.productId == null) continue;
    wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + item.quantity);
  }
  return restoreUnits(tx, orderNumber, wanted, ITEM_REMOVED_RESTORE_REASON, "removed-after-confirmation items");
}

/** Convenience for tests/diagnostics: current online stock for a product. */
export async function onlineStock(productId: number): Promise<number> {
  const p = await prisma.product.findUnique({ where: { id: productId }, select: { stock: true } });
  return p?.stock ?? 0;
}
