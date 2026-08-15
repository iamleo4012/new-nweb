import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { validateTransition, createNotification, notificationMessage, STATUS_LABELS } from "@/lib/order-workflow";
import type { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["confirm", "cancel"]),
});

/**
 * POST /api/orders/[id]/confirm — customer confirms or cancels their order.
 *
 * The order must be in READY_FOR_CONFIRMATION status. The customer can either:
 *   - confirm: order moves to CONFIRMED (unavailable items become REMOVED_AFTER_CONFIRMATION)
 *   - cancel: order moves to CANCELLED_BY_CUSTOMER
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, data: null, error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: "Invalid input" }, { status: 400 });
  }

  const orderId = Number(idParam);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ success: false, data: null, error: "Invalid order id" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    return NextResponse.json({ success: false, data: null, error: "Order not found" }, { status: 404 });
  }

  // Authorization: must own the order via the current account (userId match),
  // never by email alone — prevents a reused email from acting on a deleted
  // account's order.
  const isOwner = order.userId === user.id;
  if (!isOwner) {
    return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
  }

  const targetStatus: OrderStatus = parsed.data.action === "confirm" ? "CONFIRMED" : "CANCELLED_BY_CUSTOMER";
  try {
    validateTransition(order.status, targetStatus);
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: `Order cannot be confirmed/cancelled in its current status (${STATUS_LABELS[order.status]}).` },
      { status: 409 }
    );
  }

  // On confirm, mark unavailable items as REMOVED_AFTER_CONFIRMATION.
  if (targetStatus === "CONFIRMED") {
    for (const item of order.items) {
      if (item.itemStatus === "UNAVAILABLE") {
        await prisma.orderItem.update({ where: { id: item.id }, data: { itemStatus: "REMOVED_AFTER_CONFIRMATION" } });
      }
    }
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: targetStatus,
      statusHistory: { create: { status: targetStatus, note: parsed.data.action === "confirm" ? "Customer confirmed order" : "Customer cancelled order" } },
    },
    include: { items: true },
  });

  await createNotification(
    updated.id,
    updated.userId,
    `ORDER_${targetStatus}`,
    notificationMessage(targetStatus, updated.orderNumber)
  );

  return NextResponse.json({
    success: true,
    data: {
      orderNumber: updated.orderNumber,
      status: updated.status,
      statusLabel: STATUS_LABELS[updated.status],
    },
    error: null,
  });
}
