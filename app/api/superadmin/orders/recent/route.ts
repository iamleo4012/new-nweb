import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/auth";

/**
 * GET /api/superadmin/orders/recent — recent orders for the owner overview.
 * This is a READ-ONLY feed: the dashboard links each row into the EXISTING
 * /admin order-management system; no duplicate order management exists here.
 */
export async function GET(req: NextRequest) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
  }

  const limit = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("limit") ?? "10", 10) || 10, 1), 50);

  const orders = await prisma.order.findMany({
    orderBy: { id: "desc" },
    take: limit,
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      customerEmail: true,
      status: true,
      total: true,
      currency: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      orders: orders.map((o) => ({
        ...o,
        total: Number(o.total),
      })),
    },
    error: null,
  });
}
