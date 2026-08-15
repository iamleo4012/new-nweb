import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { STATUS_LABELS } from "@/lib/order-workflow";
import type { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

/**
 * GET /api/admin/orders/[id]/timeline — full order status-event timeline.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) return forbidden();

  const { id: idParam } = await params;
  const orderId = Number(idParam);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ success: false, data: null, error: "Invalid order id" }, { status: 400 });
  }

  const events = await prisma.orderStatusEvent.findMany({
    where: { orderId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    success: true,
    data: {
      timeline: events.map((e) => ({
        id: e.id,
        status: e.status,
        statusLabel: STATUS_LABELS[e.status as OrderStatus] ?? e.status,
        note: e.note,
        createdAt: e.createdAt,
      })),
    },
    error: null,
  });
}
