import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { orderShortPath } from "@/lib/order-link";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/orders/[id]/order-link — staff-gated.
 *
 * Returns the signed short public Order Sent URL for one order:
 *   {APP_URL|origin}/o/{id}-{hmac signature}
 * The signature is computed SERVER-SIDE from JWT_SECRET — no signing secret
 * is ever exposed to the browser. Base URL uses the configured APP_URL when
 * set (so generated links follow the public domain), falling back to the
 * request origin for local testing. No database writes.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireStaff();
  if (!staff) {
    return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.json({ success: false, data: null, error: "Invalid order ID" }, { status: 400 });
  }
  const order = await prisma.order.findUnique({
    where: { id: numericId },
    select: { orderNumber: true },
  });
  if (!order) {
    return NextResponse.json({ success: false, data: null, error: "Order not found" }, { status: 404 });
  }
  const path = orderShortPath(numericId);
  const base = (process.env.APP_URL || req.nextUrl.origin).replace(/\/+$/, "");
  return NextResponse.json({
    success: true,
    data: { orderNumber: order.orderNumber, path, url: base + path },
    error: null,
  });
}
