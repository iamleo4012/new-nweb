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
    // Grouped by SLUG ONLY: the OrderItem name is a display snapshot taken at
    // order time, and one product can legitimately appear under more than one
    // historical name (renames, or the TEST_OWNER_ANALYTICS-prefixed analytics
    // fixtures). Grouping by (slug, name) split such products into several
    // rows — duplicating the slug in the response and colliding React keys on
    // the dashboard. Display names are resolved after the query from the live
    // Product row, falling back to the latest snapshot for retired products.
    prisma.orderItem.groupBy({
      by: ["slug"],
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
      topProducts: await resolveTopProductNames(topItems),
    },
    error: null,
  });
}

/**
 * Map grouped (slug -> sold) rows to display names. Prefers the CURRENT
 * Product.name so renames are reflected; for slugs no longer in the catalog
 * (product deactivated/retired) falls back to the most recent OrderItem
 * snapshot name. Always exactly one row per slug.
 */
async function resolveTopProductNames(
  topItems: Array<{ slug: string; _sum: { quantity: number | null } }>
): Promise<Array<{ slug: string; name: string; sold: number }>> {
  const slugs = topItems.map((t) => t.slug);
  if (slugs.length === 0) return [];
  const [products, fallbacks] = await Promise.all([
    prisma.product.findMany({ where: { slug: { in: slugs } }, select: { slug: true, name: true } }),
    // distinct-on-slug latest snapshot for any slug missing from Product
    prisma.orderItem.findMany({
      where: { slug: { in: slugs } },
      orderBy: { id: "desc" },
      distinct: ["slug"],
      select: { slug: true, name: true },
    }),
  ]);
  const names = new Map<string, string>();
  for (const f of fallbacks) names.set(f.slug, f.name); // fallback layer
  for (const p of products) names.set(p.slug, p.name); // live name wins
  return topItems.map((t) => ({ slug: t.slug, name: names.get(t.slug) ?? t.slug, sold: t._sum.quantity ?? 0 }));
}
