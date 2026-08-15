import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStaff, requireAdmin } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

const optionalStr = (max: number) => z.string().max(max).optional().default("");
const optInt = () => z.number().int().min(0).max(1000000).optional();
const optDec = () => z.number().min(0).max(999999).optional();
const nullableInt = () => z.number().int().positive().nullable().optional();

const sharedFields = {
  name: z.string().min(2).max(200),
  description: z.string().max(8000),
  longDescription: z.string().max(20000),
  price: z.number().min(0).max(999999),
  costPrice: z.number().min(0).max(999999),
  discount: z.number().min(0).max(100).optional().default(0),
  stock: z.number().int().min(0).max(1000000),
  minStock: z.number().int().min(0).max(1000000).optional().default(10),
  image: z.string().max(1000),
  images: z.array(z.string().max(1000)).optional().default([]),
  line: z.string().max(100),
  sku: z.string().max(100),
  barcode: z.string().max(200),
  ndNumber: z.string().max(100),
  internalCode: z.string().max(100),
  specs: z.string().max(20000),
  applications: z.string().max(8000),
  additionalInfo: z.string().max(8000),
  seoTitle: z.string().max(200),
  seoDescription: z.string().max(500),
  tags: z.array(z.string().max(60)).optional().default([]),
  weight: z.number().min(0).max(999999).nullable().optional(),
  length: z.number().min(0).max(999999).nullable().optional(),
  width: z.number().min(0).max(999999).nullable().optional(),
  height: z.number().min(0).max(999999).nullable().optional(),
  warranty: z.string().max(200),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  isBestSeller: z.boolean(),
  isNewArrival: z.boolean(),
};

const createSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and dashes"),
  ...sharedFields,
  categoryId: z.number().int().positive(),
  subcategoryId: z.number().int().positive().nullable().optional(),
  brandId: nullableInt(),
  materialId: nullableInt(),
  supplierId: nullableInt(),
  unitId: nullableInt(),
  countryId: nullableInt(),
  taxId: nullableInt(),
  colorIds: z.array(z.number().int().positive()).optional().default([]),
  sizeIds: z.array(z.number().int().positive()).optional().default([]),
});

const updateSchema = z.object({
  id: z.number().int().positive(),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and dashes")
    .optional(),
  ...Object.fromEntries(Object.entries(sharedFields).map(([k, v]) => [k, (v as z.ZodTypeAny).optional()])),
  categoryId: z.number().int().positive().optional(),
  subcategoryId: z.number().int().positive().nullable().optional(),
  brandId: nullableInt(),
  materialId: nullableInt(),
  supplierId: nullableInt(),
  unitId: nullableInt(),
  countryId: nullableInt(),
  taxId: nullableInt(),
  colorIds: z.array(z.number().int().positive()).optional(),
  sizeIds: z.array(z.number().int().positive()).optional(),
});

const productInclude = {
  category: { include: { department: { select: { id: true, name: true } }, section: { select: { id: true, name: true } } } },
  subcategory: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
  material: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
  unit: { select: { id: true, name: true } },
  country: { select: { id: true, name: true } },
  tax: { select: { id: true, name: true, rate: true } },
  colors: { include: { color: { select: { id: true, name: true, slug: true, hex: true } } } },
  sizes: { include: { size: { select: { id: true, name: true, slug: true } } } },
  mediaImages: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProductInclude;

type FullProduct = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function serialize(p: FullProduct) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    longDescription: p.longDescription,
    price: Number(p.price),
    costPrice: Number(p.costPrice),
    currency: p.currency,
    discount: Number(p.discount),
    image: p.image,
    images: p.images,
    line: p.line,
    sku: p.sku,
    barcode: p.barcode,
    ndNumber: p.ndNumber,
    internalCode: p.internalCode,
    specs: typeof p.specs === "string" ? p.specs : JSON.stringify(p.specs),
    applications: p.applications,
    additionalInfo: p.additionalInfo,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    tags: p.tags,
    weight: p.weight ? Number(p.weight) : null,
    length: p.length ? Number(p.length) : null,
    width: p.width ? Number(p.width) : null,
    height: p.height ? Number(p.height) : null,
    warranty: p.warranty,
    stock: p.stock,
    minStock: p.minStock,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    isBestSeller: p.isBestSeller,
    isNewArrival: p.isNewArrival,
    categoryId: p.categoryId,
    subcategoryId: p.subcategoryId,
    brandId: p.brandId,
    materialId: p.materialId,
    supplierId: p.supplierId,
    unitId: p.unitId,
    countryId: p.countryId,
    taxId: p.taxId,
    department: p.category?.department ?? null,
    section: p.category?.section ?? null,
    category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
    subcategory: p.subcategory,
    brand: p.brand,
    material: p.material,
    supplier: p.supplier,
    unit: p.unit,
    country: p.country,
    tax: p.tax ? { id: p.tax.id, name: p.tax.name, rate: Number(p.tax.rate) } : null,
    colors: p.colors.map((c) => c.color),
    sizes: p.sizes.map((s) => s.size),
    mediaImages: p.mediaImages,
  };
}

function listSerialize(p: FullProduct) {
  return {
    ...serialize(p),
    category: p.category?.name ?? "",
    categoryName: p.category?.name ?? "",
    departmentName: p.category?.department?.name ?? "",
  };
}

export async function GET(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return forbidden();
  const withFull = req.nextUrl.searchParams.get("full") === "1";
  const products = await prisma.product.findMany({
    include: productInclude,
    orderBy: { id: "asc" },
  });
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      departmentId: true,
      sectionId: true,
      department: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({
    success: true,
    data: {
      products: products.map((p) => (withFull ? serialize(p) : listSerialize(p))),
      categories,
    },
    error: null,
  });
}

export async function POST(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return forbidden();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const dup = await prisma.product.findUnique({ where: { slug: data.slug } });
  if (dup) return NextResponse.json({ success: false, data: null, error: "Slug already exists" }, { status: 409 });
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) return NextResponse.json({ success: false, data: null, error: "Category not found" }, { status: 400 });

  const {
    colorIds, sizeIds,
    categoryId, subcategoryId, brandId, materialId, supplierId, unitId, countryId, taxId,
    ...productFields
  } = data;
  const productData: Prisma.ProductCreateInput = {
    ...productFields,
    specs: (() => {
      try { return JSON.parse(productFields.specs || "[]") as unknown as Prisma.InputJsonValue; } catch { return []; }
    })(),
    category: { connect: { id: categoryId } },
  };
  if (subcategoryId) productData.subcategory = { connect: { id: subcategoryId } };
  if (brandId) productData.brand = { connect: { id: brandId } };
  if (materialId) productData.material = { connect: { id: materialId } };
  if (supplierId) productData.supplier = { connect: { id: supplierId } };
  if (unitId) productData.unit = { connect: { id: unitId } };
  if (countryId) productData.country = { connect: { id: countryId } };
  if (taxId) productData.tax = { connect: { id: taxId } };
  if (colorIds.length) productData.colors = { create: colorIds.map((cid) => ({ colorId: cid })) };
  if (sizeIds.length) productData.sizes = { create: sizeIds.map((sid) => ({ sizeId: sid })) };

  const created = await prisma.product.create({ data: productData, include: productInclude });
  await prisma.auditLog.create({
    data: { actorId: staff.id, action: "PRODUCT_CREATE", entity: "Product", entityId: String(created.id), detail: created.slug },
  });
  return NextResponse.json({ success: true, data: { product: serialize(created) }, error: null });
}

export async function PATCH(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return forbidden();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { id, colorIds, sizeIds, ...rest } = parsed.data;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ success: false, data: null, error: "Product not found" }, { status: 404 });

  const fields: Prisma.ProductUpdateInput = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v === undefined) continue;
    if (k === "specs" && typeof v === "string") {
      try { fields.specs = JSON.parse(v) as unknown as Prisma.InputJsonValue; } catch { fields.specs = []; }
      continue;
    }
    if (k === "categoryId") { fields.category = { connect: { id: v as number } }; continue; }
    if (k === "subcategoryId") { fields.subcategory = v == null ? { disconnect: true } : { connect: { id: v as number } }; continue; }
    if (k === "brandId") { fields.brand = v == null ? { disconnect: true } : { connect: { id: v as number } }; continue; }
    if (k === "materialId") { fields.material = v == null ? { disconnect: true } : { connect: { id: v as number } }; continue; }
    if (k === "supplierId") { fields.supplier = v == null ? { disconnect: true } : { connect: { id: v as number } }; continue; }
    if (k === "unitId") { fields.unit = v == null ? { disconnect: true } : { connect: { id: v as number } }; continue; }
    if (k === "countryId") { fields.country = v == null ? { disconnect: true } : { connect: { id: v as number } }; continue; }
    if (k === "taxId") { fields.tax = v == null ? { disconnect: true } : { connect: { id: v as number } }; continue; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fields as any)[k] = v;
  }
  if (colorIds) {
    fields.colors = { deleteMany: {}, create: colorIds.map((colorId) => ({ colorId })) };
  }
  if (sizeIds) {
    fields.sizes = { deleteMany: {}, create: sizeIds.map((sizeId) => ({ sizeId })) };
  }

  const updated = await prisma.product.update({ where: { id }, data: fields, include: productInclude });
  await prisma.auditLog.create({
    data: { actorId: staff.id, action: "PRODUCT_UPDATE", entity: "Product", entityId: String(id), detail: Object.keys(fields).join(",") },
  });
  return NextResponse.json({ success: true, data: { product: serialize(updated) }, error: null });
}

export async function DELETE(req: NextRequest) {
  // Soft-deleting (deactivating) a product is a destructive action.
  const admin = await requireAdmin();
  if (!admin) return forbidden();
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ success: false, data: null, error: "Invalid id" }, { status: 400 });
  }
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ success: false, data: null, error: "Product not found" }, { status: 404 });
  const updated = await prisma.product.update({ where: { id }, data: { isActive: false }, include: productInclude });
  await prisma.auditLog.create({
    data: { actorId: admin.id, action: "PRODUCT_DEACTIVATE", entity: "Product", entityId: String(id), detail: existing.slug },
  });
  return NextResponse.json({ success: true, data: { product: listSerialize(updated) }, error: null });
}
