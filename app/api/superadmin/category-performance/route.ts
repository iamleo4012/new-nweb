import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { resolveRange, categoryPerformance, type CategoryLevel } from "@/lib/analytics";

/**
 * GET /api/superadmin/category-performance?range=…&level=department|category|subcategory
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

  const levelParam = req.nextUrl.searchParams.get("level") ?? "department";
  const level: CategoryLevel =
    levelParam === "category" || levelParam === "subcategory" ? levelParam : "department";

  const rows = await categoryPerformance(resolved.from, resolved.to, level);

  return NextResponse.json({
    success: true,
    data: { range: { key: resolved.range, label: resolved.label }, level, rows, currency: "KD" },
    error: null,
  });
}
