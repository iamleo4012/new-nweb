import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { STATUS_LABELS, calculateBillableTotals } from "@/lib/order-workflow";
import { findOrderByAccessToken } from "@/lib/order-access";
import type { OrderStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const ORDER_INCLUDE = {
  items: true,
  statusHistory: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.OrderInclude;

/**
 * GET /api/orders/[id] — order detail.
 *
 * Access rules (security fix: guests can no longer enumerate orders):
 *   - Authenticated customer: only their own order (userId match).
 *   - Staff (ADMIN, STAFF, SUPERADMIN): any order.
 *   - Guest: ONLY with a valid capability token (?token=…) issued at
 *     checkout. Sequential ids / order numbers alone grant nothing — an
 *     unauthenticated caller receives 401, and a wrong/absent token 404.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const user = await getSessionUser();
  const token = req.nextUrl.searchParams.get("token");
  const byNumber = req.nextUrl.searchParams.get("by") === "number";

  let order;

  if (user) {
    // --- Authenticated path: resolve by numeric ID or orderNumber ----------
    if (byNumber) {
      order = await prisma.order.findUnique({
        where: { orderNumber: idParam },
        include: ORDER_INCLUDE,
      });
    } else {
      const numericId = Number(idParam);
      if (!Number.isInteger(numericId) || numericId <= 0) {
        return NextResponse.json({ success: false, data: null, error: "Invalid order ID" }, { status: 400 });
      }
      order = await prisma.order.findUnique({
        where: { id: numericId },
        include: ORDER_INCLUDE,
      });
    }
    if (!order) {
      return NextResponse.json({ success: false, data: null, error: "Order not found" }, { status: 404 });
    }
    // Ownership is anchored to the current account's userId only — never by
    // email alone, so a reused email cannot surface a deleted account's order.
    // SUPERADMIN is admitted as staff so the owner retains order oversight.
    const isStaff = user.role === "ADMIN" || user.role === "STAFF" || user.role === "SUPERADMIN";
    const isOwner = order.userId === user.id;
    if (!isStaff && !isOwner) {
      return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
    }
  } else {
    // --- Guest path: capability token REQUIRED ------------------------------
    if (!token) {
      return NextResponse.json(
        { success: false, data: null, error: "Please sign in or use the tracking link from your order confirmation." },
        { status: 401 }
      );
    }
    order = await findOrderByAccessToken(token, ORDER_INCLUDE);
    if (!order) {
      return NextResponse.json({ success: false, data: null, error: "Order not found" }, { status: 404 });
    }
    // If the guest addressed a specific order (id or number), it must match
    // the order the token actually belongs to.
    if (byNumber) {
      if (idParam !== order.orderNumber) {
        return NextResponse.json({ success: false, data: null, error: "Order not found" }, { status: 404 });
      }
    } else {
      const numericId = Number(idParam);
      if (!Number.isInteger(numericId) || numericId <= 0) {
        return NextResponse.json({ success: false, data: null, error: "Invalid order ID" }, { status: 400 });
      }
      if (numericId !== order.id) {
        return NextResponse.json({ success: false, data: null, error: "Order not found" }, { status: 404 });
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        statusLabel: STATUS_LABELS[order.status as OrderStatus] ?? order.status,
        staffNotes: order.staffNotes,
        posStatus: order.posStatus,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        address: order.address,
        city: order.city,
        notes: order.notes,
        currency: order.currency,
        ...calculateBillableTotals(
          order.items.map((i) => ({ price: i.price, quantity: i.quantity, itemStatus: i.itemStatus })),
          order.shipping
        ),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: order.items.map((i) => ({
          id: i.id,
          slug: i.slug,
          name: i.name,
          image: i.image,
          price: Number(i.price),
          quantity: i.quantity,
          itemStatus: i.itemStatus,
        })),
        timeline: order.statusHistory.map((e) => ({
          status: e.status,
          statusLabel: STATUS_LABELS[e.status as OrderStatus] ?? e.status,
          note: e.note,
          createdAt: e.createdAt,
        })),
      },
    },
    error: null,
  });
}
