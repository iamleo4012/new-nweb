import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { resolveRange, revenueSummary, salesSeries } from "@/lib/analytics";

/**
 * GET /api/superadmin/sales?range=…&from=…&to=…
 * Period summary + bucketed time-series (revenue / orders / AOV) + the
 * order-status breakdown WITHIN the same range (drives Order Analytics).
 * Uses the centralized analytics definition; the SAME resolved range must
 * drive every dashboard component.
 */
export async function GET(req: NextRequest) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
  }

  let resolved;
  try {
    resolved = resolveRange(
      req.nextUrl.searchParams.get("range"),
      req.nextUrl.searchParams.get("from"),
      req.nextUrl.searchParams.get("to")
    );
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid custom date range" },
      { status: 400 }
    );
  }

  const [summary, series, ordersByStatusRows] = await Promise.all([
    revenueSummary(resolved.from, resolved.to),
    salesSeries(resolved.from, resolved.to, resolved.bucket),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { createdAt: { gte: resolved.from, lt: resolved.to } },
    }),
  ]);

  const ordersByStatus: Record<string, number> = {};
  let ordersInRange = 0;
  for (const row of ordersByStatusRows) {
    ordersByStatus[row.status] = row._count._all;
    ordersInRange += row._count._all;
  }

  return NextResponse.json({
    success: true,
    data: {
      range: {
        key: resolved.range,
        label: resolved.label,
        from: resolved.from.toISOString(),
        to: resolved.to.toISOString(),
        bucket: resolved.bucket,
      },
      summary,
      series,
      ordersInRange,
      ordersByStatus,
      currency: "KD",
    },
    error: null,
  });
}
