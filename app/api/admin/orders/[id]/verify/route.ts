import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import {
  validateTransition,
  createNotification,
  notificationMessage,
  STATUS_LABELS,
} from "@/lib/order-workflow";
import type { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const itemStatusSchema = z.object({
  itemId: z.number().int().positive(),
  itemStatus: z.enum(["AVAILABLE", "UNAVAILABLE"]),
});

const verifySchema = z.object({
  items: z.array(itemStatusSchema).min(1),
  staffNotes: z.string().max(2000).optional(),
});

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

/**
 * PATCH /api/admin/orders/[id]/verify — staff submits item-availability check.
 *
 * Staff marks each item as AVAILABLE or UNAVAILABLE based on physical store
 * check. The order moves from PENDING/UNDER_REVIEW to READY_FOR_CONFIRMATION
 * (if all items are checked). Staff notes can be appended.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) return forbidden();

  const { id: idParam } = await params;
  const orderId = Number(idParam);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ success: false, data: null, error: "Invalid order id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: "Invalid input" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    return NextResponse.json({ success: false, data: null, error: "Order not found" }, { status: 404 });
  }

  // Order must be in PENDING or UNDER_REVIEW to verify items.
  if (order.status !== "PENDING" && order.status !== "UNDER_REVIEW") {
    return NextResponse.json(
      { success: false, data: null, error: `Order cannot be verified in status ${STATUS_LABELS[order.status]}.` },
      { status: 409 }
    );
  }

  // Move to UNDER_REVIEW if still PENDING.
  if (order.status === "PENDING") {
    validateTransition("PENDING", "UNDER_REVIEW");
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "UNDER_REVIEW",
        statusHistory: { create: { status: "UNDER_REVIEW", note: "Staff started review" } },
      },
    });
    await createNotification(orderId, order.userId, "ORDER_UNDER_REVIEW", notificationMessage("UNDER_REVIEW", order.orderNumber));
  }

  // Update item statuses.
  const itemMap = new Map(order.items.map((i) => [i.id, i]));
  for (const update of parsed.data.items) {
    const item = itemMap.get(update.itemId);
    if (!item || item.orderId !== orderId) {
      return NextResponse.json(
        { success: false, data: null, error: `Item ${update.itemId} does not belong to this order` },
        { status: 400 }
      );
    }
    await prisma.orderItem.update({
      where: { id: update.itemId },
      data: { itemStatus: update.itemStatus },
    });
  }

  // Update staff notes if provided.
  if (parsed.data.staffNotes !== undefined) {
    await prisma.order.update({
      where: { id: orderId },
      data: { staffNotes: parsed.data.staffNotes },
    });
  }

  return NextResponse.json({
    success: true,
    data: { message: "Item availability updated." },
    error: null,
  });
}
