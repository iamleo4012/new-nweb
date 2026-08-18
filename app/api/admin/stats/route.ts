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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    orderCount,
    productCount,
    customerCount,
    statusGroups,
    pendingReview,
    waitingConfirmation,
    readyForPacking,
    readyForDelivery,
    deliveredToday,
    completedToday,
    cancelledToday,
    recentOrders,
    topItems,
    unreadNotifications,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.order.count({ where: { status: { in: ["PENDING", "UNDER_REVIEW"] } } }),
    prisma.order.count({ where: { status: "READY_FOR_CONFIRMATION" } }),
    prisma.order.count({ where: { status: "CONFIRMED" } }),
    prisma.order.count({ where: { status: "READY_FOR_DELIVERY" } }),
    prisma.order.count({ where: { status: "DELIVERED", updatedAt: { gte: today } } }),
    prisma.order.count({ where: { status: "COMPLETED", updatedAt: { gte: today } } }),
    prisma.order.count({ where: { status: { in: ["CANCELLED_BY_CUSTOMER", "CANCELLED_BY_STAFF"] }, updatedAt: { gte: today } } }),
    prisma.order.findMany({
      orderBy: { id: "desc" },
      take: 8,
      select: { id: true, orderNumber: true, customerName: true, status: true, total: true, currency: true, createdAt: true },
    }),
    // "Most Ordered Products" uses the same billable definition as the owner
    // analytics (lib/analytics.ts): items from cancelled orders and items
    // removed after confirmation are excluded, so staff sees real demand.
    prisma.orderItem.groupBy({
      by: ["slug", "name"],
      _sum: { quantity: true },
      where: {
        itemStatus: { notIn: ["REMOVED_AFTER_CONFIRMATION"] },
        order: { status: { notIn: ["CANCELLED_BY_CUSTOMER", "CANCELLED_BY_STAFF"] } },
      },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),
    // Unread notifications for THIS admin only (was previously counting all
    // users' notifications).
    prisma.notification.count({ where: { readAt: null, userId: staff.id } }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      totals: {
        orders: orderCount,
        products: productCount,
        customers: customerCount,
      },
      operational: {
        pendingReview,
        waitingConfirmation,
        readyForPacking,
        readyForDelivery,
        deliveredToday,
        completedToday,
        cancelledToday,
        unreadNotifications,
      },
      ordersByStatus: statusGroups.map((g) => ({ status: g.status, count: g._count._all })),
      recentOrders: recentOrders.map((o) => ({ ...o, total: Number(o.total) })),
      topProducts: topItems.map((t) => ({ slug: t.slug, name: t.name, sold: t._sum.quantity ?? 0 })),
    },
    error: null,
  });
}
