import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { revenueSummary } from "@/lib/analytics";

/**
 * GET /api/superadmin/overview — owner KPI cards, all real database values.
 * Revenue figures come from lib/analytics.ts (the single authoritative
 * billable-revenue definition). No metric is ever estimated.
 */
export async function GET() {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // Monday
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const epoch = new Date(0);

  const endOfToday = new Date(today);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const endOfYesterday = new Date(today);
  const endOfWeek = new Date(weekStart);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    totalSales,
    todaySales,
    yesterdaySales,
    weekSales,
    monthSales,
    totalOrders,
    ordersByStatus,
    productsTotal,
    productsActive,
    stockAgg,
    lowStockCount,
    outOfStockCount,
    customers,
  ] = await Promise.all([
    revenueSummary(epoch, endOfToday),
    revenueSummary(today, endOfToday),
    revenueSummary(yesterday, endOfYesterday),
    revenueSummary(weekStart, endOfWeek),
    revenueSummary(monthStart, endOfMonth),
    prisma.order.count(),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.aggregate({ where: { isActive: true }, _sum: { stock: true } }),
    prisma.product.count({ where: { isActive: true, stock: { gt: 0, lte: prisma.product.fields.minStock } } }),
    prisma.product.count({ where: { isActive: true, stock: { lte: 0 } } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
  ]);

  const statusMap: Record<string, number> = {};
  for (const row of ordersByStatus) statusMap[row.status] = row._count._all;
  const sum = (...statuses: string[]) => statuses.reduce((acc, s) => acc + (statusMap[s] ?? 0), 0);

  return NextResponse.json({
    success: true,
    data: {
      sales: {
        total: totalSales.revenue,
        today: todaySales.revenue,
        yesterday: yesterdaySales.revenue,
        thisWeek: weekSales.revenue,
        thisMonth: monthSales.revenue,
        currency: "KD",
      },
      orders: {
        total: totalOrders,
        // Derived KPI trio (documented mapping) + the full raw breakdown.
        pending: sum("PENDING", "UNDER_REVIEW", "READY_FOR_CONFIRMATION"),
        inFulfillment: sum("CONFIRMED", "PACKING", "READY_FOR_DELIVERY", "OUT_FOR_DELIVERY"),
        completed: sum("DELIVERED", "COMPLETED"),
        cancelled: sum("CANCELLED_BY_CUSTOMER", "CANCELLED_BY_STAFF"),
        byStatus: statusMap,
        returned: null, // no RETURNED status exists in the data model
      },
      products: {
        total: productsTotal,
        active: productsActive,
        totalStock: stockAgg._sum.stock ?? 0,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
      },
      customers,
    },
    error: null,
  });
}
