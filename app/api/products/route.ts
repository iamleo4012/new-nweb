import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { customFieldsInclude, customFieldsPayload, loadCustomI18n } from "@/lib/custom-fields";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() || "";
  const category = sp.get("category")?.trim() || "";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(sp.get("limit")) || 24));

  const where: Prisma.ProductWhereInput = { isActive: true };
  if (category) where.category = { slug: category };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { line: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { category: { include: { department: true } }, ...customFieldsInclude },
      orderBy: { id: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const i18n = await loadCustomI18n(products.map((p) => p.id));

  return NextResponse.json({
    success: true,
    data: products.map((p) => ({
      id: p.slug,
      name: p.name,
      price: Number(p.price),
      currency: p.currency,
      img: p.image,
      images: p.images,
      description: p.description,
      line: p.line,
      category: p.category.slug,
      purchaseMode: p.category.department.purchaseMode,
      sku: p.sku,
      specs: p.specs,
      stock: p.stock,
      // Additive PIM fields (see lib/custom-fields.ts)
      ...customFieldsPayload(p, i18n),
    })),
    error: null,
    meta: { total, page, limit },
  });
}
