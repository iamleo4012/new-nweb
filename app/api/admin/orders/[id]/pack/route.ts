import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import {
  validateTransition,
  lockAndValidateTransition,
  createNotification,
  notificationMessage,
  STATUS_LABELS,
  TransitionError,
} from "@/lib/order-workflow";
import type { OrderStatus, PosStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const packSchema = z.object({
  action: z.enum(["pack", "ready", "deliver", "complete"]),
  posStatus: z.enum(["NOT_CREATED", "INVOICED", "HANDED_TO_DELIVERY"]).optional(),
});

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

/**
 * PATCH /api/admin/orders/[id]/pack — staff advances the order through
 * the fulfillment stages: packing → ready_for_delivery → out_for_delivery
 * → delivered → completed. Also supports POS handoff status updates.
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
  const parsed = packSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: "Invalid input" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) {
    return NextResponse.json({ success: false, data: null, error: "Order not found" }, { status: 404 });
  }

  const actionMap: Record<string, OrderStatus> = {
    pack: "PACKING",
    ready: "READY_FOR_DELIVERY",
    deliver: "OUT_FOR_DELIVERY",
    complete: "DELIVERED",
  };
  const targetStatus = actionMap[parsed.data.action];
  if (!targetStatus) {
    return NextResponse.json({ success: false, data: null, error: "Unknown action" }, { status: 400 });
  }

  try {
    validateTransition(order.status, targetStatus);
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: `Cannot move from ${STATUS_LABELS[order.status]} to ${STATUS_LABELS[targetStatus]}.` },
      { status: 409 }
    );
  }

  const updateData: { status: OrderStatus; posStatus?: PosStatus } = { status: targetStatus };
  if (parsed.data.posStatus) {
    updateData.posStatus = parsed.data.posStatus;
  }

  // Item updates + status update + audit now run in ONE transaction, and the
  // transition is re-validated against the LOCKED current status: a competing
  // mutation (another staff action or the customer cancelling) that committed
  // since the read above turns this into an explicit 409 instead of a silent
  // overwrite — and can no longer leave items marked DELIVERED on an order
  // whose status update failed.
  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      await lockAndValidateTransition(tx, orderId, targetStatus);

      // Mark items as DELIVERED when order is delivered.
      if (targetStatus === "DELIVERED") {
        for (const item of order.items) {
          if (item.itemStatus === "AVAILABLE") {
            await tx.orderItem.update({ where: { id: item.id }, data: { itemStatus: "DELIVERED" } });
          }
        }
      }

      const saved = await tx.order.update({
        where: { id: orderId },
        data: {
          ...updateData,
          statusHistory: { create: { status: targetStatus, note: `Staff action: ${parsed.data.action}` } },
        },
        include: { items: true },
      });

      await tx.auditLog.create({
        data: {
          actorId: staff.id,
          action: "ORDER_FULFILLMENT",
          entity: "Order",
          entityId: String(orderId),
          detail: `${order.status} -> ${targetStatus}`,
        },
      });

      return saved;
    });
  } catch (e) {
    if (e instanceof TransitionError) {
      return NextResponse.json(
        { success: false, data: null, error: `Cannot move from ${STATUS_LABELS[order.status]} to ${STATUS_LABELS[targetStatus]}.` },
        { status: 409 }
      );
    }
    throw e;
  }

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
      posStatus: updated.posStatus,
    },
    error: null,
  });
}
