import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/auth";

/**
 * GET /api/superadmin/stock — inventory monitoring from the EXISTING
 * Product.stock / Product.minStock fields only (no second inventory system).
 */
export async function GET() {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
  }

  const active = { isActive: true };
  const selection = {
    id: true,
    slug: true,
    name: true,
    image: true,
    stock: true,
    minStock: true,
    sku: true,
  } as const;

  const [totalStock, lowStockCount, outOfStockCount, lowStock, outOfStock, highest, lowest] =
    await Promise.all([
      prisma.product.aggregate({ where: active, _sum: { stock: true } }),
      prisma.product.count({ where: { ...active, stock: { gt: 0, lte: prisma.product.fields.minStock } } }),
      prisma.product.count({ where: { ...active, stock: { lte: 0 } } }),
      prisma.product.findMany({
        where: { ...active, stock: { gt: 0, lte: prisma.product.fields.minStock } },
        select: selection,
        orderBy: { stock: "asc" },
        take: 20,
      }),
      prisma.product.findMany({
        where: { ...active, stock: { lte: 0 } },
        select: selection,
        orderBy: { name: "asc" },
        take: 20,
      }),
      prisma.product.findMany({ where: active, select: selection, orderBy: { stock: "desc" }, take: 10 }),
      prisma.product.findMany({
        where: { ...active, stock: { gt: 0 } },
        select: selection,
        orderBy: { stock: "asc" },
        take: 10,
      }),
    ]);

  return NextResponse.json({
    success: true,
    data: {
      totals: {
        totalStock: totalStock._sum.stock ?? 0,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
      },
      lowStock,
      outOfStock,
      highest,
      lowest,
    },
    error: null,
  });
}
