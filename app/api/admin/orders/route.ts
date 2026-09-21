import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import {
  ORDER_STATUSES,
  STATUS_LABELS,
  validateTransition,
  lockAndValidateTransition,
  TransitionError,
  createNotification,
  notificationMessage,
  calculateBillableTotals,
} from "@/lib/order-workflow";
import { restoreOnlineStockForOrder, restoreStockForRemovedItems } from "@/lib/online-stock";
import { orderShortPath } from "@/lib/order-link";
import type { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(ORDER_STATUSES as unknown as [OrderStatus, ...OrderStatus[]]),
  note: z.string().max(500).optional().default(""),
});

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

function serializeOrder(o: {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  notes: string;
  staffNotes: string;
  posStatus: string;
  status: string;
  subtotal: unknown;
  shipping: unknown;
  total: unknown;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  items: {
    id: number;
    slug: string;
    name: string;
    image: string;
    price: unknown;
    quantity: number;
    itemStatus: string;
  }[];
}) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    customerPhone: o.customerPhone,
    address: o.address,
    city: o.city,
    notes: o.notes,
    staffNotes: o.staffNotes,
    posStatus: o.posStatus,
    status: o.status,
    statusLabel: STATUS_LABELS[o.status as OrderStatus] ?? o.status,
    ...calculateBillableTotals(
      o.items.map((i) => ({ price: i.price, quantity: i.quantity, itemStatus: i.itemStatus })),
      o.shipping
    ),
    currency: o.currency,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    items: o.items.map((i) => ({
      id: i.id,
      slug: i.slug,
      name: i.name,
      image: i.image,
      price: Number(i.price),
      quantity: i.quantity,
      itemStatus: i.itemStatus,
    })),
  };
}

export async function GET(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return forbidden();
  const status = req.nextUrl.searchParams.get("status");
  // Search: matches the invoice number (e.g. "AN-2026-000001") OR the
  // customer name, case-insensitively. Lets admin retrieve any historical
  // order even after the original customer account has been deleted
  // (orderNumber survives; customerName is snapshotted on the order).
  // Combinable with the status filter.
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  // Server-side pagination: the previous implementation silently capped the
  // list at 200 orders (take: 200), making older orders unreachable as the
  // business grows. Page size is clamped to a sane range.
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 20));
  const where: {
    status?: OrderStatus;
    createdAt?: { gte?: Date; lte?: Date };
    OR?: Array<{ orderNumber: { contains: string; mode: "insensitive" } } | { customerName: { contains: string; mode: "insensitive" } }>;
  } = {};
  if (status && (ORDER_STATUSES as readonly string[]).includes(status)) {
    where.status = status as OrderStatus;
  }
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
    ];
  }
  // Optional inclusive creation-date range (YYYY-MM-DD, server-local).
  // Used by the Store Orders page for historical From/To searches; when
  // absent, the page defaults to the last three days via its own from param.
  const fromRaw = req.nextUrl.searchParams.get("from");
  const toRaw = req.nextUrl.searchParams.get("to");
  const createdAt: { gte?: Date; lte?: Date } = {};
  if (fromRaw) { const d = new Date(fromRaw + "T00:00:00"); if (!isNaN(d.getTime())) createdAt.gte = d; }
  if (toRaw) { const d = new Date(toRaw + "T23:59:59.999"); if (!isNaN(d.getTime())) createdAt.lte = d; }
  if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { id: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return NextResponse.json({
    success: true,
    data: {
      orders: orders.map(function (o) {
        return { ...serializeOrder(o), shortPath: orderShortPath(o.id) };
      }),
      pagination: { page, limit, total, totalPages },
    },
    error: null,
  });
}

export async function PATCH(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return forbidden();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: "Invalid input" }, { status: 400 });
  }

  const existing = await prisma.order.findUnique({
    where: { id: parsed.data.id },
    include: { items: true },
  });
  if (!existing) {
    return NextResponse.json({ success: false, data: null, error: "Order not found" }, { status: 404 });
  }

  // Enforce the state machine.
  const fromStatus = existing.status;
  const toStatus = parsed.data.status;
  try {
    validateTransition(fromStatus, toStatus);
  } catch (e) {
    if (e instanceof TransitionError) {
      return NextResponse.json({ success: false, data: null, error: e.message }, { status: 409 });
    }
    throw e;
  }

  // Status change + item updates + online-stock side effects run in ONE
  // transaction so the movement ledger and Product.stock always agree with
  // the order state.
  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      // Concurrency guard: re-validate the transition against the LOCKED,
      // currently-committed status. A competing mutation (another admin
      // action, or the customer confirming/cancelling) that committed since
      // the pre-read above makes this throw → 409, never a silent overwrite.
      await lockAndValidateTransition(tx, parsed.data.id, toStatus);

      // ONLINE STOCK: declining/cancelling an order returns exactly the
      // quantities it reserved (skip items already returned via
      // REMOVED_AFTER_CONFIRMATION; legacy orders have no reservation ledger
      // rows so nothing is invented).
      if (toStatus === "CANCELLED_BY_STAFF") {
        await restoreOnlineStockForOrder(tx, existing, "ORDER_DECLINED_RESTORE");
      }

      // If moving to CONFIRMED, mark all UNAVAILABLE items as removed — their
      // reserved units go back to online stock immediately (partial restore).
      if (toStatus === "CONFIRMED") {
        const removed = existing.items.filter((item) => item.itemStatus === "UNAVAILABLE");
        for (const item of removed) {
          await tx.orderItem.update({ where: { id: item.id }, data: { itemStatus: "REMOVED_AFTER_CONFIRMATION" } });
        }
        if (removed.length) {
          await restoreStockForRemovedItems(tx, existing.orderNumber, removed);
        }
      }

      const order = await tx.order.update({
        where: { id: parsed.data.id },
        data: {
          status: toStatus,
          statusHistory: { create: { status: toStatus, note: parsed.data.note } },
        },
        include: { items: true },
      });

      await tx.auditLog.create({
        data: {
          actorId: staff.id,
          action: "ORDER_STATUS_CHANGE",
          entity: "Order",
          entityId: String(order.id),
          detail: `${fromStatus} -> ${toStatus}`,
        },
      });

      return order;
    });
  } catch (e) {
    if (e instanceof TransitionError) {
      // Either the request raced a concurrent mutation (the locked status
      // moved on) or the transition was invalid all along — either way the
      // order is untouched and the caller gets an explicit conflict.
      return NextResponse.json({ success: false, data: null, error: e.message }, { status: 409 });
    }
    throw e;
  }

  // Create customer notification (outside the transaction — best-effort).
  await createNotification(
    updated.id,
    updated.userId,
    `ORDER_${toStatus}`,
    notificationMessage(toStatus, updated.orderNumber)
  );

  return NextResponse.json({ success: true, data: { order: serializeOrder(updated) }, error: null });
}
