/**
 * lib/low-stock.ts — low-stock alert rules for the ONLINE STORE inventory.
 *
 * Threshold model (documented business rule):
 *   Every product carries its OWN replenishment threshold in
 *   `Product.minStock` — an admin-managed field (default 10) labelled
 *   "Minimum Stock" in the product form. A GLOBAL threshold was deliberately
 *   not introduced: the per-product field already exists, is editable per
 *   product, and reflects that a 2-unit trolley and a 100-unit spare-part
 *   need very different reorder points.
 *
 * Alert definition (applies to ACTIVE products only — inactive products are
 * hidden from the storefront and must never be flagged):
 *   stock === 0            → OUT_OF_STOCK
 *   0 < stock <= minStock  → LOW_STOCK   (boundary is INCLUSIVE: stock equal
 *                                          to the threshold is low stock)
 *   stock > minStock       → healthy (no alert)
 *
 * The same three automatic states are mirrored into `Product.stockStatus`
 * whenever stock changes (order reservation, cancellation restore, admin
 * edit) so the stored column finally reflects reality. The two manual
 * statuses (PREORDER, DISCONTINUED) are preserved if ever set.
 */
import type { Prisma, StockStatus } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export type StockAlertLevel = "OUT_OF_STOCK" | "LOW_STOCK";

export function alertLevel(stock: number, minStock: number): StockAlertLevel | null {
  if (stock <= 0) return "OUT_OF_STOCK";
  if (stock <= minStock) return "LOW_STOCK";
  return null;
}

/**
 * The automatic StockStatus value for a product given its current stock and
 * threshold. Manual statuses are preserved — only IN_STOCK / LOW_STOCK /
 * OUT_OF_STOCK are ever recomputed.
 */
export function derivedStockStatus(stock: number, minStock: number, current: string): StockStatus {
  if (current === "PREORDER" || current === "DISCONTINUED") return current as StockStatus;
  const level = alertLevel(stock, minStock);
  if (level === "OUT_OF_STOCK") return "OUT_OF_STOCK";
  if (level === "LOW_STOCK") return "LOW_STOCK";
  return "IN_STOCK";
}

/**
 * Re-sync Product.stockStatus after a stock/threshold change. Safe to call
 * redundantly — it only writes when the derived value differs. MUST run in
 * the same transaction as the stock mutation it follows.
 */
export async function syncStockStatus(tx: Tx, productId: number): Promise<void> {
  const p = await tx.product.findUnique({
    where: { id: productId },
    select: { stock: true, minStock: true, stockStatus: true },
  });
  if (!p) return;
  const next = derivedStockStatus(p.stock, p.minStock, p.stockStatus);
  if (next !== p.stockStatus) {
    await tx.product.update({
      where: { id: productId },
      data: { stockStatus: next },
    });
  }
}
