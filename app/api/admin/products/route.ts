import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStaff, requireAdmin } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

/**
 * Verifies every referenced master-data/relation id actually exists BEFORE
 * the create/update transaction runs. A stale id (e.g. a colour deleted
 * while the admin had the form open) must surface as a clean JSON 400 the
 * form can show — never as an unhandled 500 that leaves the client stuck.
 * Returns a human-readable error string, or null when everything resolves.
 */
async function relationIdsError(rel: {
  categoryId?: number | null;
  subcategoryId?: number | null;
  brandId?: number | null;
  materialId?: number | null;
  supplierId?: number | null;
  unitId?: number | null;
  countryId?: number | null;
  taxId?: number | null;
  colorIds?: number[];
  sizeIds?: number[];
}): Promise<string | null> {
  const single: Array<[string, number | null | undefined, "category" | "subcategory" | "brand" | "material" | "supplier" | "unit" | "country" | "tax"]> = [
    ["Category", rel.categoryId, "category"],
    ["Subcategory", rel.subcategoryId, "subcategory"],
    ["Brand", rel.brandId, "brand"],
    ["Material", rel.materialId, "material"],
    ["Supplier", rel.supplierId, "supplier"],
    ["Unit", rel.unitId, "unit"],
    ["Country", rel.countryId, "country"],
    ["Tax", rel.taxId, "tax"],
  ];
  // Resolve one id per relation type (batched per type — usually one lookup).
  for (const [label, id, table] of single) {
    if (id == null) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const found = await (prisma as any)[table].findUnique({ where: { id } });
    if (!found) {
      return `${label} no longer exists — it may have been removed. Please re-select it and save again.`;
    }
  }
  if (rel.colorIds?.length) {
    const n = await prisma.color.count({ where: { id: { in: rel.colorIds } } });
    if (n !== new Set(rel.colorIds).size) return "One of the selected colors no longer exists — please re-select the colors and save again.";
  }
  if (rel.sizeIds?.length) {
    const n = await prisma.size.count({ where: { id: { in: rel.sizeIds } } });
    if (n !== new Set(rel.sizeIds).size) return "The selected size no longer exists — please re-select the size and save again.";
  }
  return null;
}

/** Uniform JSON 500 — the client always receives a parsable body. */
function serverError(action: string) {
  return NextResponse.json(
    { success: false, data: null, error: `Could not ${action} the product due to a server error. Nothing was saved — please try again.` },
    { status: 500 }
  );
}

const optionalStr = (max: number) => z.string().max(max).optional().default("");
const optInt = () => z.number().int().min(0).max(1000000).optional();
const optDec = () => z.number().min(0).max(999999).optional();
const nullableInt = () => z.number().int().positive().nullable().optional();

const sharedFields = {
  name: z
    .string()
    .min(2, "Name must contain at least 2 characters.")
    .max(200, "Name must be at most 200 characters."),
  description: z.string().max(8000, "Short description is too long (max 8000 characters)."),
  longDescription: z.string().max(20000, "Long description is too long (max 20000 characters)."),
  price: z
    .number()
    .min(0, "Selling price must be 0 or more.")
    .max(999999, "Selling price is too large."),
  // Cost price is no longer collected in the admin product form (it is not
  // needed for the selling workflow). Kept optional + defaulted so older
  // clients that still send it keep working, and existing DB values are
  // never touched by updates that omit it.
  costPrice: z.number().min(0).max(999999).optional().default(0),
  discount: z.number().min(0, "Discount must be 0 or more.").max(100, "Discount must be 100 or less.").optional().default(0),
  stock: z
    .number()
    .int("Stock must be a whole number.")
    .min(0, "Stock must be 0 or more.")
    .max(1000000, "Stock is too large."),
  minStock: z
    .number()
    .int("Minimum stock must be a whole number.")
    .min(0, "Minimum stock must be 0 or more.")
    .max(1000000, "Minimum stock is too large.")
    .optional()
    .default(10),
  image: z.string().max(1000),
  images: z.array(z.string().max(1000)).optional().default([]),
  line: z.string().max(100),
  sku: z.string().max(100, "SKU is too long (max 100 characters)."),
  barcode: z.string().max(200),
  ndNumber: z.string().max(100),
  internalCode: z.string().max(100),
  // Internal grouping code (e.g. ZC-13). STRICTLY INTERNAL — never exposed
  // in public catalog/detail/search responses. Empty = independent product.
  classCode: z.string().trim().max(60, "Product Class is too long (max 60 characters).").optional().default(""),
  specs: z
    .string()
    .max(20000)
    .refine((v) => { try { JSON.parse(v || "[]"); return true; } catch { return false; } }, {
      message: "Specifications contain invalid data — please re-open the Specifications editor and fix the rows.",
    }),
  applications: z.string().max(8000, "Applications is too long (max 8000 characters)."),
  additionalInfo: z.string().max(8000, "Additional information is too long (max 8000 characters)."),
  seoTitle: z.string().max(200),
  seoDescription: z.string().max(500),
  tags: z.array(z.string().max(60, "Each tag must be at most 60 characters.")).optional().default([]),
  weight: z.number().min(0, "Weight must be 0 or more.").max(999999).nullable().optional(),
  length: z.number().min(0, "Length must be 0 or more.").max(999999).nullable().optional(),
  width: z.number().min(0, "Width must be 0 or more.").max(999999).nullable().optional(),
  height: z.number().min(0, "Height must be 0 or more.").max(999999).nullable().optional(),
  // Depth + shared dimension unit are plain Product columns. The unit
  // applies to length/width/height/depth; omitted on PATCH = keep current
  // values (no default in the update schema).
  depth: z.number().min(0, "Depth must be 0 or more.").max(999999).nullable().optional(),
  dimensionUnit: z.enum(["mm", "cm", "m"], { message: "Dimension unit must be mm, cm, or m." }).optional().default("cm"),
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
  // Dynamic PIM fields: per-product values keyed by subcategory attribute id.
  // All optional — empty custom fields never block product creation.
  // `valueAr` is the dynamic-spec bilingual companion (English in `value`).
  customValues: z
    .array(
      z.object({
        attributeId: z.number().int().positive(),
        value: z.string().max(2000),
        valueAr: z.string().max(2000).optional().default(""),
      })
    )
    .max(200)
    .optional(),
  // Admin-selected related products (product ids, order = display order).
  relatedProductIds: z.array(z.number().int().positive()).max(50).optional(),
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
  // Plain Product columns — explicit (no default) on PATCH so an omitted
  // value means "keep current" rather than resetting to cm.
  depth: z.number().min(0, "Depth must be 0 or more.").max(999999).nullable().optional(),
  dimensionUnit: z.enum(["mm", "cm", "m"], { message: "Dimension unit must be mm, cm, or m." }).optional(),
  brandId: nullableInt(),
  materialId: nullableInt(),
  supplierId: nullableInt(),
  unitId: nullableInt(),
  countryId: nullableInt(),
  taxId: nullableInt(),
  colorIds: z.array(z.number().int().positive()).optional(),
  sizeIds: z.array(z.number().int().positive()).optional(),
  customValues: z
    .array(
      z.object({
        attributeId: z.number().int().positive(),
        value: z.string().max(2000),
        valueAr: z.string().max(2000).optional().default(""),
      })
    )
    .max(200)
    .optional(),
  relatedProductIds: z.array(z.number().int().positive()).max(50).optional(),
});

const productInclude = {
  category: { include: { department: { select: { id: true, name: true } }, section: { select: { id: true, name: true } } } },
  subcategory: {
    select: {
      id: true,
      name: true,
      customAttributes: { where: { isDeleted: false }, orderBy: [{ section: "asc" }, { displayOrder: "asc" }, { id: "asc" }] },
    },
  },
  brand: { select: { id: true, name: true } },
  material: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
  unit: { select: { id: true, name: true } },
  country: { select: { id: true, name: true } },
  tax: { select: { id: true, name: true, rate: true } },
  colors: { include: { color: { select: { id: true, name: true, slug: true, hex: true } } } },
  sizes: { include: { size: { select: { id: true, name: true, slug: true } } } },
  mediaImages: { orderBy: { sortOrder: "asc" } },
  customValues: true,
  relatedFrom: { orderBy: { displayOrder: "asc" }, include: { related: { select: { id: true, slug: true, name: true, image: true } } } },
} satisfies Prisma.ProductInclude;

type FullProduct = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

/** Merged attribute+value shape for the admin product form (bilingual). */
async function serializeFull(p: FullProduct) {  const valueByAttr = new Map(p.customValues.map((v) => [v.attributeId, v.value]));
  // Definitions for the product's classification: subcategory fields plus,
  // as a fallback, category-level fields (for categories without
  // subcategories). categoryId has no Prisma relation (legacy table), so
  // category-level definitions are fetched manually and merged.
  const catAttrs = p.categoryId
    ? await prisma.customAttribute.findMany({
        where: { categoryId: p.categoryId, subcategoryId: null, isDeleted: false },
      })
    : [];
  const attrDefs = [...(p.subcategory?.customAttributes ?? []), ...catAttrs].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.id - b.id
  );
  const attrIds = attrDefs.map((a) => a.id);
  const [attrI18n, optionI18n, valueI18n] = await Promise.all([
    attrIds.length
      ? prisma.attributeI18n.findMany({ where: { attributeId: { in: attrIds } } })
      : Promise.resolve([] as { attributeId: number; nameAr: string; multiSelect: boolean }[]),
    attrIds.length
      ? prisma.attributeOptionI18n.findMany({ where: { attributeId: { in: attrIds } } })
      : Promise.resolve([] as { attributeId: number; optionEn: string; optionAr: string }[]),
    prisma.productCustomValueI18n.findMany({ where: { productId: p.id } }),
  ]);
  const nameAr = new Map(attrI18n.map((a) => [a.attributeId, a.nameAr]));
  const multi = new Map(attrI18n.map((a) => [a.attributeId, a.multiSelect]));
  const optAr = new Map(optionI18n.map((o) => [`${o.attributeId}:${o.optionEn}`, o.optionAr]));
  const valAr = new Map(valueI18n.map((v) => [v.attributeId, v.valueAr]));
  const customAttributes = attrDefs.map((a) => ({
    id: a.id,
    name: a.name,
    nameAr: nameAr.get(a.id) ?? "",
    section: a.section,
    fieldType: a.fieldType,
    multiSelect: multi.get(a.id) ?? false,
    displayOrder: a.displayOrder,
    options: a.options,
    optionsAr: Object.fromEntries(a.options.map((o) => [o, optAr.get(`${a.id}:${o}`) ?? ""])),
    value: valueByAttr.get(a.id) ?? "",
    valueAr: valAr.get(a.id) ?? "",
  }));
  return serializeBase(p, customAttributes);
}

/** Legacy flat serializer (list rows) — unchanged shape. */
function serialize(p: FullProduct) {
  const valueByAttr = new Map(p.customValues.map((v) => [v.attributeId, v.value]));
  const customAttributes = (p.subcategory?.customAttributes ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    section: a.section,
    fieldType: a.fieldType,
    displayOrder: a.displayOrder,
    options: a.options,
    value: valueByAttr.get(a.id) ?? "",
  }));
  return serializeBase(p, customAttributes);
}

function serializeBase(p: FullProduct, customAttributes: unknown) {
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
    classCode: p.classCode,
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
    depth: p.depth ? Number(p.depth) : null,
    dimensionUnit: p.dimensionUnit,
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
    subcategory: p.subcategory ? { id: p.subcategory.id, name: p.subcategory.name } : null,
    brand: p.brand,
    material: p.material,
    supplier: p.supplier,
    unit: p.unit,
    country: p.country,
    tax: p.tax ? { id: p.tax.id, name: p.tax.name, rate: Number(p.tax.rate) } : null,
    colors: p.colors.map((c) => c.color),
    sizes: p.sizes.map((s) => s.size),
    mediaImages: p.mediaImages,
    customAttributes,
    relatedProducts: p.relatedFrom.map((r) => r.related),
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

/**
 * Persists per-product custom attribute values. Only attribute ids that
 * belong to the product's (new) classification — its subcategory's fields
 * OR its category's fallback fields — and are not soft-deleted are stored;
 * attributes from unrelated classifications are silently dropped so
 * switching classification never mixes field sets. Empty values are stored
 * as "".
 */
async function persistCustomValues(
  productId: number,
  subcategoryId: number | null | undefined,
  categoryId: number | null | undefined,
  customValues: { attributeId: number; value: string; valueAr?: string }[]
) {
  await prisma.productCustomValue.deleteMany({ where: { productId } });
  if ((!subcategoryId && !categoryId) || customValues.length === 0) {
    // No values at all — clear any stale Arabic rows too.
    await prisma.productCustomValueI18n.deleteMany({ where: { productId } });
    return;
  }
  const ids = customValues.map((v) => v.attributeId);
  const valid = await prisma.customAttribute.findMany({
    where: {
      id: { in: ids },
      isDeleted: false,
      OR: [
        // Subcategory-scoped definitions (primary).
        ...(subcategoryId ? [{ subcategoryId }] : []),
        // Category-level fallback definitions (categories without
        // subcategories); categoryId -1 matches nothing when unknown.
        { categoryId: categoryId ?? -1, subcategoryId: null },
      ],
    },
    select: { id: true },
  });
  const validIds = new Set(valid.map((a) => a.id));
  const seen = new Set<number>();
  const rows = customValues.filter((v) => {
    if (!validIds.has(v.attributeId) || seen.has(v.attributeId)) return false;
    seen.add(v.attributeId);
    return true;
  });
  if (rows.length) {
    await prisma.productCustomValue.createMany({
      data: rows.map((v) => ({ productId, attributeId: v.attributeId, value: v.value })),
      skipDuplicates: true,
    });
    // Arabic companions keyed by the natural (productId, attributeId) pair, so
    // they survive the EN-row rewrite above. Stale rows (attribute dropped or
    // product moved subcategory) are pruned.
    await prisma.productCustomValueI18n.deleteMany({
      where: { productId, attributeId: { notIn: rows.map((r) => r.attributeId) } },
    });
    for (const v of rows) {
      if (v.valueAr !== undefined) {
        await prisma.productCustomValueI18n.upsert({
          where: { productId_attributeId: { productId, attributeId: v.attributeId } },
          create: { productId, attributeId: v.attributeId, valueAr: v.valueAr },
          update: { valueAr: v.valueAr },
        });
      }
    }
  } else {
    await prisma.productCustomValueI18n.deleteMany({ where: { productId } });
  }
}

/** Persists admin-selected related products (ordered, self-links dropped). */
async function persistRelated(productId: number, relatedProductIds: number[]) {
  await prisma.relatedProduct.deleteMany({ where: { productId } });
  const unique = [...new Set(relatedProductIds)].filter((id) => id !== productId);
  if (unique.length === 0) return;
  const existing = await prisma.product.findMany({ where: { id: { in: unique } }, select: { id: true } });
  const validIds = new Set(existing.map((p) => p.id));
  const rows = unique.filter((id) => validIds.has(id));
  if (rows.length) {
    await prisma.relatedProduct.createMany({
      data: rows.map((id, index) => ({ productId, relatedId: id, displayOrder: index })),
      skipDuplicates: true,
    });
  }
}

export async function GET(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return forbidden();
  const withFull = req.nextUrl.searchParams.get("full") === "1";
  // Optional single-product fetch (used by the edit form to load the full
  // record including custom field values and related products).
  const idParam = Number(req.nextUrl.searchParams.get("id"));
  if (Number.isInteger(idParam) && idParam > 0) {
    const product = await prisma.product.findUnique({ where: { id: idParam }, include: productInclude });
    if (!product) return NextResponse.json({ success: false, data: null, error: "Product not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: { product: await serializeFull(product) }, error: null });
  }
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
  if (dup) return NextResponse.json({ success: false, data: null, error: "A product with this slug already exists — please choose a different slug." }, { status: 409 });
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) return NextResponse.json({ success: false, data: null, error: "The selected category no longer exists — please re-select the classification." }, { status: 400 });

  const {
    colorIds, sizeIds, customValues, relatedProductIds,
    categoryId, subcategoryId, brandId, materialId, supplierId, unitId, countryId, taxId,
    ...productFields
  } = data;
  // Every referenced master-data id must resolve before the transaction —
  // stale ids get a clean JSON 400 instead of an unhandled 500.
  const badRelation = await relationIdsError({
    categoryId, subcategoryId: subcategoryId ?? null, brandId: brandId ?? null, materialId: materialId ?? null,
    supplierId: supplierId ?? null, unitId: unitId ?? null, countryId: countryId ?? null, taxId: taxId ?? null,
    colorIds, sizeIds,
  });
  if (badRelation) return NextResponse.json({ success: false, data: null, error: badRelation }, { status: 400 });

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

  try {
    const created = await prisma.product.create({ data: productData, include: productInclude });
    if (customValues) {
      await persistCustomValues(created.id, subcategoryId ?? null, categoryId, customValues);
    }
    if (relatedProductIds) {
      await persistRelated(created.id, relatedProductIds);
    }
    const fresh = await prisma.product.findUnique({ where: { id: created.id }, include: productInclude });
    await prisma.auditLog.create({
      data: { actorId: staff.id, action: "PRODUCT_CREATE", entity: "Product", entityId: String(created.id), detail: created.slug },
    });
    return NextResponse.json({ success: true, data: { product: await serializeFull(fresh ?? created) }, error: null });
  } catch (err) {
    console.error("product create failed:", err);
    return serverError("create");
  }
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
  const { id, colorIds, sizeIds, customValues, relatedProductIds, ...rest } = parsed.data;
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
  const nextSubcategoryId =
    parsed.data.subcategoryId !== undefined ? parsed.data.subcategoryId : existing.subcategoryId;
  const nextCategoryId =
    parsed.data.categoryId !== undefined ? parsed.data.categoryId : existing.categoryId;

  // Validate every referenced relation id before the update — stale ids get
  // a clean JSON 400 instead of an unhandled 500 (same as create).
  const badRelation = await relationIdsError({
    categoryId: nextCategoryId ?? null,
    subcategoryId: nextSubcategoryId ?? null,
    brandId: (parsed.data as Record<string, unknown>).brandId as number | null | undefined ?? null,
    materialId: (parsed.data as Record<string, unknown>).materialId as number | null | undefined ?? null,
    supplierId: (parsed.data as Record<string, unknown>).supplierId as number | null | undefined ?? null,
    unitId: (parsed.data as Record<string, unknown>).unitId as number | null | undefined ?? null,
    countryId: (parsed.data as Record<string, unknown>).countryId as number | null | undefined ?? null,
    taxId: (parsed.data as Record<string, unknown>).taxId as number | null | undefined ?? null,
    colorIds,
    sizeIds,
  });
  if (badRelation) return NextResponse.json({ success: false, data: null, error: badRelation }, { status: 400 });

  try {
    const updated = await prisma.product.update({ where: { id }, data: fields, include: productInclude });
    // Dynamic PIM data is persisted AFTER the row update so the new
    // subcategory (if changed) is the one the attribute values are validated
    // against — switching subcategories replaces the visible field set.
    if (customValues) {
      await persistCustomValues(id, nextSubcategoryId, nextCategoryId, customValues);
    }
    if (relatedProductIds) {
      await persistRelated(id, relatedProductIds);
    }
    const fresh = await prisma.product.findUnique({ where: { id }, include: productInclude });
    await prisma.auditLog.create({
      data: { actorId: staff.id, action: "PRODUCT_UPDATE", entity: "Product", entityId: String(id), detail: Object.keys(fields).join(",") },
    });
    // Stock changes get their own explicit old→new audit event so the owner
    // activity feed can answer "who changed this product's stock, when, from
    // what, to what" (additive — the generic PRODUCT_UPDATE row above remains).
    // The update schema is spread-built (sharedFields), so read the value
    // defensively instead of through the inferred type.
    const stockInput = "stock" in parsed.data ? (parsed.data as Record<string, unknown>).stock : undefined;
    if (typeof stockInput === "number" && stockInput !== existing.stock) {
      await prisma.auditLog.create({
        data: {
          actorId: staff.id,
          action: "PRODUCT_STOCK_CHANGE",
          entity: "Product",
          entityId: String(id),
          detail: `slug=${existing.slug}; stock: ${existing.stock} -> ${stockInput}`,
        },
      });
    }
    return NextResponse.json({ success: true, data: { product: await serializeFull(fresh ?? updated) }, error: null });
  } catch (err) {
    // Editing the slug to one that already exists violates the unique index.
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { success: false, data: null, error: "A product with this slug already exists — please choose a different slug." },
        { status: 409 }
      );
    }
    console.error("product update failed:", err);
    return serverError("update");
  }
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
