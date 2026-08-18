import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { resolveRange, topProducts, type TopProductSort } from "@/lib/analytics";

/**
 * GET /api/superadmin/top-products?range=…&sort=units|revenue|lowest&limit=10
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

  const sortParam = req.nextUrl.searchParams.get("sort") ?? "units";
  const sort: TopProductSort =
    sortParam === "revenue" || sortParam === "lowest" ? sortParam : "units";
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "10", 10) || 10;

  const products = await topProducts(resolved.from, resolved.to, sort, limit);

  return NextResponse.json({
    success: true,
    data: { range: { key: resolved.range, label: resolved.label }, sort, products, currency: "KD" },
    error: null,
  });
}
