import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { alertLevel } from "@/lib/low-stock";

export const dynamic = "force-dynamic";

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

/**
 * Low-stock alert list for ADMIN and STAFF.
 *
 * Flags ACTIVE products whose ONLINE stock is at or below their per-product
 * threshold (Product.minStock — "Minimum Stock" in the product form; default
 * 10). Inactive products are never flagged (hidden products are not for sale
 * and are not awaiting replenishment attention).
 *
 * Response rows are ordered worst-first: out-of-stock before low-stock, then
 * ascending stock, then name — so the top of the list is always the most
 * urgent replenishment.
 */
export async function GET() {
  const staff = await requireStaff();
  if (!staff) return forbidden();

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      sku: true,
      stock: true,
      minStock: true,
      category: { select: { name: true } },
    },
    orderBy: [{ stock: "asc" }, { name: "asc" }],
  });

  const items = products
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      sku: p.sku || "—",
      stock: p.stock,
      threshold: p.minStock,
      category: p.category?.name ?? "—",
      status: alertLevel(p.stock, p.minStock),
    }))
    .filter((p): p is typeof p & { status: "OUT_OF_STOCK" | "LOW_STOCK" } => p.status !== null)
    .sort((a, b) => {
      // Out of stock first, then ascending stock, then name.
      if (a.status !== b.status) return a.status === "OUT_OF_STOCK" ? -1 : 1;
      if (a.stock !== b.stock) return a.stock - b.stock;
      return a.name.localeCompare(b.name);
    });

  return NextResponse.json({
    success: true,
    data: {
      items,
      counts: {
        total: items.length,
        outOfStock: items.filter((i) => i.status === "OUT_OF_STOCK").length,
        lowStock: items.filter((i) => i.status === "LOW_STOCK").length,
      },
    },
    error: null,
  });
}
