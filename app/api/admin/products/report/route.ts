import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Read-only data source for the admin Product Report (Print / Export PDF).
 *
 * Returns the COMPLETE matching dataset (no pagination — the existing admin
 * products GET works the same way and the admin table is built on it), with
 * the requested visibility + optional filters applied server-side, plus the
 * per-product set of modified field keys derived from the existing AuditLog
 * change-tracking (PRODUCT_UPDATE rows record the changed field names in
 * `detail` as a comma-joined list). No product row is ever written here.
 *
 * Access: requireAdmin() — same gate as the rest of /api/admin/products.
 */

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

const productInclude = {
  category: { include: { department: { select: { id: true, name: true } } } },
  subcategory: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
  material: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
  unit: { select: { id: true, name: true } },
  country: { select: { id: true, name: true } },
  tax: { select: { id: true, name: true, rate: true } },
} satisfies Prisma.ProductInclude;

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return forbidden();

  const sp = req.nextUrl.searchParams;

  // Visibility: "all" = every product row (displayed + hidden/soft-deleted);
  // "displayed" = only isActive products — the same flag the public catalog
  // filters on (see app/api/products/route.ts).
  const visibility = sp.get("visibility") === "displayed" ? "displayed" : "all";

  const q = sp.get("q")?.trim() || "";
  const categoryId = Number(sp.get("categoryId")) || 0;
  const idFrom = Number(sp.get("idFrom")) || 0;
  const idTo = Number(sp.get("idTo")) || 0;

  const where: Prisma.ProductWhereInput = {};
  if (visibility === "displayed") where.isActive = true;
  if (categoryId > 0) where.categoryId = categoryId;
  if (idFrom > 0 || idTo > 0) {
    where.id = {
      ...(idFrom > 0 ? { gte: idFrom } : {}),
      ...(idTo > 0 ? { lte: idTo } : {}),
    };
  }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { nameAr: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { barcode: { contains: q, mode: "insensitive" } },
      { internalCode: { contains: q, mode: "insensitive" } },
      { ndNumber: { contains: q, mode: "insensitive" } },
    ];
  }

  const [products, updates] = await Promise.all([
    prisma.product.findMany({ where, include: productInclude, orderBy: { id: "asc" } }),
    // Latest per-product PRODUCT_UPDATE event: its `detail` lists the field
    // keys changed in that most recent edit (written by the PATCH handler).
    prisma.auditLog.findMany({
      where: { action: "PRODUCT_UPDATE", entity: "Product" },
      orderBy: { id: "desc" },
      select: { entityId: true, detail: true },
    }),
  ]);

  // First occurrence per product id = most recent update for that product.
  const modifiedFields: Record<string, string[]> = {};
  const seen = new Set<string>();
  for (const u of updates) {
    if (seen.has(u.entityId)) continue;
    seen.add(u.entityId);
    const keys = u.detail.split(",").map((s) => s.trim()).filter(Boolean);
    if (keys.length) modifiedFields[u.entityId] = keys;
  }

  return NextResponse.json({
    success: true,
    data: {
      total: products.length,
      visibility,
      products: products.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        nameAr: p.nameAr,
        description: p.description,
        longDescription: p.longDescription,
        price: Number(p.price),
        costPrice: Number(p.costPrice),
        currency: p.currency,
        image: p.image,
        images: p.images,
        line: p.line,
        sku: p.sku,
        barcode: p.barcode,
        ndNumber: p.ndNumber,
        internalCode: p.internalCode,
        classCode: p.classCode,
        specs: p.specs,
        applications: p.applications,
        additionalInfo: p.additionalInfo,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        tags: p.tags,
        weight: p.weight === null ? null : Number(p.weight),
        length: p.length === null ? null : Number(p.length),
        width: p.width === null ? null : Number(p.width),
        height: p.height === null ? null : Number(p.height),
        depth: p.depth === null ? null : Number(p.depth),
        dimensionUnit: p.dimensionUnit,
        warranty: p.warranty,
        stock: p.stock,
        minStock: p.minStock,
        stockStatus: p.stockStatus,
        isActive: p.isActive,
        isFeatured: p.isFeatured,
        isNewArrival: p.isNewArrival,
        isBestSeller: p.isBestSeller,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        department: p.category?.department?.name ?? "",
        category: p.category?.name ?? "",
        subcategory: p.subcategory?.name ?? "",
        brand: p.brand?.name ?? "",
        material: p.material?.name ?? "",
        supplier: p.supplier?.name ?? "",
        unit: p.unit?.name ?? "",
        country: p.country?.name ?? "",
        tax: p.tax ? (p.tax.rate ? `${p.tax.name} (${Number(p.tax.rate)}%)` : p.tax.name) : "",
      })),
      modifiedFields,
    },
    error: null,
  });
}
