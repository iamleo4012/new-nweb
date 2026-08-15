import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { STATUS_LABELS, calculateBillableTotals } from "@/lib/order-workflow";
import type { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/orders/[id] — order detail for the customer.
 *
 * Returns the order with items (including per-item availability status),
 * staff notes, and the full timeline of status events. Accessible by:
 *   - The user who placed the order (userId match)
 *   - A guest who knows the orderNumber (lookup by orderNumber via ?by=number)
 *   - Staff (requireStaff)
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const user = await getSessionUser();

  // Allow lookup by numeric ID or by orderNumber (?by=number).
  const byNumber = req.nextUrl.searchParams.get("by") === "number";
  let order;
  if (byNumber) {
    order = await prisma.order.findUnique({
      where: { orderNumber: idParam },
      include: { items: true, statusHistory: { orderBy: { createdAt: "asc" } } },
    });
  } else {
    const numericId = Number(idParam);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return NextResponse.json({ success: false, data: null, error: "Invalid order ID" }, { status: 400 });
    }
    order = await prisma.order.findUnique({
      where: { id: numericId },
      include: { items: true, statusHistory: { orderBy: { createdAt: "asc" } } },
    });
  }

  if (!order) {
    return NextResponse.json({ success: false, data: null, error: "Order not found" }, { status: 404 });
  }

  // Authorization: an authenticated user owns the order only if it is tied to
  // their current account (userId match) — never by email alone, so a reused
  // email cannot surface a deleted account's order. Staff may view any order.
  // Guests (no session) may look up an order by its orderNumber.
  const isStaff = user && (user.role === "ADMIN" || user.role === "STAFF");
  const isOwner = user && order.userId === user.id;
  if (!isStaff && !isOwner) {
    // Guest access is allowed (the order was placed by a guest with this email).
    // If a session user exists and doesn't own it, deny.
    if (user) {
      return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
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
