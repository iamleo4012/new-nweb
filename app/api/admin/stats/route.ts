import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

export async function GET() {
  const staff = await requireStaff();
  if (!staff) return forbidden();

  const [orderCount, revenueAgg, productCount, customerCount, statusGroups, lowStock, recentOrders, topItems] =
    await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { notIn: ["CANCELLED", "REJECTED"] } },
      }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.product.findMany({
        where: { isActive: true, stock: { lte: 10 } },
        orderBy: { stock: "asc" },
        take: 10,
        select: { slug: true, name: true, stock: true, sku: true },
      }),
      prisma.order.findMany({
        orderBy: { id: "desc" },
        take: 8,
        select: { orderNumber: true, customerName: true, status: true, total: true, currency: true, createdAt: true },
      }),
      prisma.orderItem.groupBy({
        by: ["slug", "name"],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 10,
      }),
    ]);

  return NextResponse.json({
    success: true,
    data: {
      totals: {
        orders: orderCount,
        revenue: Number(revenueAgg._sum.total ?? 0),
        products: productCount,
        customers: customerCount,
      },
      ordersByStatus: statusGroups.map((g) => ({ status: g.status, count: g._count._all })),
      lowStock,
      recentOrders: recentOrders.map((o) => ({ ...o, total: Number(o.total) })),
      topProducts: topItems.map((t) => ({ slug: t.slug, name: t.name, sold: t._sum.quantity ?? 0 })),
    },
    error: null,
  });
}
