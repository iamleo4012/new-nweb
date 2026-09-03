import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStaff, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

const nameField = z.string().trim().min(1, "Field name is required").max(100, "Field name too long");

/** Dropdown option: legacy plain string (EN only) or {en, ar} object. */
const optionSchema = z.union([
  z.string().trim().min(1).max(100),
  z.object({ en: z.string().trim().min(1).max(100), ar: z.string().max(100).optional().default("") }),
]);
type NormalizedOption = { en: string; ar: string };
function normalizeOptions(raw: z.infer<typeof optionSchema>[]): NormalizedOption[] {
  return raw.map((o) => (typeof o === "string" ? { en: o, ar: "" } : { en: o.en, ar: o.ar }));
}

const createSchema = z
  .object({
    /** Exactly one scope must be given: the subcategory (primary) or, for
     *  categories without subcategories, the category itself. */
    subcategoryId: z.number().int().positive().optional(),
    categoryId: z.number().int().positive().optional(),
    name: nameField,
    nameAr: z.string().trim().max(100).optional().default(""),
    section: z.enum(["HEADER", "DESCRIPTION", "SPECIFICATIONS"]),
    fieldType: z.enum(["TEXT", "LONG_TEXT", "NUMBER", "SELECT"]).optional().default("TEXT"),
    options: z.array(optionSchema).max(50).optional().default([]),
    /** Only meaningful for SELECT — renders multi-checkbox input on product forms. */
    multiSelect: z.boolean().optional().default(false),
  })
  .refine((d) => (d.subcategoryId != null) !== (d.categoryId != null), {
    message: "Provide exactly one of subcategoryId or categoryId",
  });

/** Prisma scope filter for one classification (exactly one side set). */
type AttrScope = { subcategoryId: number } | { categoryId: number; subcategoryId: null };
function scopeFilter(scope: AttrScope) {
  return scope;
}

const updateSchema = z.object({
  id: z.number().int().positive(),
  name: nameField.optional(),
  nameAr: z.string().trim().max(100).optional(),
  fieldType: z.enum(["TEXT", "LONG_TEXT", "NUMBER", "SELECT"]).optional(),
  options: z.array(optionSchema).max(50).optional(),
  multiSelect: z.boolean().optional(),
});

/**
 * Persist the i18n companion rows for an attribute inside the caller's flow:
 * Arabic name + multiSelect flag (1:1) and Arabic labels for dropdown
 * options (matched by the EN option text, which is the stored value key).
 */
async function persistAttributeI18n(
  attributeId: number,
  nameAr: string | undefined,
  multiSelect: boolean | undefined,
  options: NormalizedOption[] | undefined
) {
  if (nameAr !== undefined || multiSelect !== undefined) {
    const existing = await prisma.attributeI18n.findUnique({ where: { attributeId } });
    if (existing) {
      await prisma.attributeI18n.update({
        where: { attributeId },
        data: {
          ...(nameAr !== undefined ? { nameAr } : {}),
          ...(multiSelect !== undefined ? { multiSelect } : {}),
        },
      });
    } else {
      await prisma.attributeI18n.create({
        data: { attributeId, nameAr: nameAr ?? "", multiSelect: multiSelect ?? false },
      });
    }
  }
  if (options) {
    // Labels for options that no longer exist are removed with the set.
    await prisma.attributeOptionI18n.deleteMany({ where: { attributeId } });
    const rows = options.filter((o) => o.ar.trim() !== "");
    if (rows.length) {
      await prisma.attributeOptionI18n.createMany({
        data: rows.map((o) => ({ attributeId, optionEn: o.en, optionAr: o.ar })),
        skipDuplicates: true,
      });
    }
  }
}

/** Merged attribute shape for the admin UI (EN fields unchanged + i18n). */
async function attributesWithI18n(scope: AttrScope) {
  const items = await prisma.customAttribute.findMany({
    where: { ...scope, isDeleted: false },
    orderBy: [{ section: "asc" }, { displayOrder: "asc" }, { id: "asc" }],
    include: { _count: { select: { values: true } } },
  });
  const ids = items.map((a) => a.id);
  const [attrI18n, optionI18n] = await Promise.all([
    ids.length ? prisma.attributeI18n.findMany({ where: { attributeId: { in: ids } } }) : Promise.resolve([]),
    ids.length ? prisma.attributeOptionI18n.findMany({ where: { attributeId: { in: ids } } }) : Promise.resolve([]),
  ]);
  const nameAr = new Map(attrI18n.map((a) => [a.attributeId, a.nameAr]));
  const multi = new Map(attrI18n.map((a) => [a.attributeId, a.multiSelect]));
  const optAr = new Map<string, string>(optionI18n.map((o) => [`${o.attributeId}:${o.optionEn}`, o.optionAr]));
  return items.map((a) => ({
    id: a.id,
    name: a.name,
    nameAr: nameAr.get(a.id) ?? "",
    section: a.section,
    fieldType: a.fieldType,
    options: a.options,
    optionsAr: Object.fromEntries(a.options.map((o) => [o, optAr.get(`${a.id}:${o}`) ?? ""])),
    multiSelect: multi.get(a.id) ?? false,
    displayOrder: a.displayOrder,
    valueCount: a._count.values,
  }));
}

/**
 * GET /api/admin/attributes?subcategoryId=X  |  ?categoryId=Y
 * Lists the dynamic custom fields defined for one classification (all three
 * information areas), ordered by area then display order. Subcategory scope
 * is primary; category scope is the fallback for categories without
 * subcategories. Soft-deleted fields are hidden.
 */
export async function GET(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return forbidden();
  const subcategoryId = Number(req.nextUrl.searchParams.get("subcategoryId"));
  const categoryId = Number(req.nextUrl.searchParams.get("categoryId"));
  const hasSub = Number.isInteger(subcategoryId) && subcategoryId > 0;
  const hasCat = Number.isInteger(categoryId) && categoryId > 0;
  if (hasSub === hasCat) {
    return NextResponse.json(
      { success: false, data: null, error: "Provide exactly one of subcategoryId or categoryId" },
      { status: 400 }
    );
  }
  const items = await attributesWithI18n(hasSub ? { subcategoryId } : { categoryId, subcategoryId: null });
  return NextResponse.json({ success: true, data: { items }, error: null });
}

/**
 * POST /api/admin/attributes — "+ Add Info". Defines a new custom field for a
 * subcategory. The field is created ONCE here; every product in that
 * subcategory then gets an input for it (values are stored per product in
 * ProductCustomValue).
 */
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
  const options = normalizeOptions(data.options);
  if (data.fieldType === "SELECT" && options.length < 1) {
    return NextResponse.json(
      { success: false, data: null, error: "Select fields need at least one option" },
      { status: 400 }
    );
  }
  const scope: AttrScope = data.subcategoryId != null
    ? { subcategoryId: data.subcategoryId }
    : { categoryId: data.categoryId!, subcategoryId: null };
  if (scope.subcategoryId != null) {
    const subcategory = await prisma.subcategory.findUnique({ where: { id: scope.subcategoryId } });
    if (!subcategory) {
      return NextResponse.json({ success: false, data: null, error: "Subcategory not found" }, { status: 400 });
    }
  } else {
    const category = await prisma.category.findUnique({ where: { id: scope.categoryId } });
    if (!category) {
      return NextResponse.json({ success: false, data: null, error: "Category not found" }, { status: 400 });
    }
  }
  // Uniqueness is enforced among live (non-deleted) fields of the SAME
  // classification, case-insensitive, across all three areas — the admin
  // thinks of field names as one namespace per classification.
  const existing = await prisma.customAttribute.findMany({
    where: { ...scope, isDeleted: false },
    select: { name: true },
  });
  if (existing.some((a) => a.name.toLowerCase() === data.name.toLowerCase())) {
    return NextResponse.json(
      { success: false, data: null, error: `Field "${data.name}" already exists in this classification` },
      { status: 409 }
    );
  }
  const maxOrder = await prisma.customAttribute.findFirst({
    where: { ...scope, section: data.section, isDeleted: false },
    orderBy: { displayOrder: "desc" },
    select: { displayOrder: true },
  });
  const created = await prisma.customAttribute.create({
    data: {
      ...scope,
      name: data.name,
      section: data.section,
      fieldType: data.fieldType,
      options: data.fieldType === "SELECT" ? options.map((o) => o.en) : [],
      displayOrder: (maxOrder?.displayOrder ?? -1) + 1,
    },
  });
  await persistAttributeI18n(
    created.id,
    data.nameAr,
    data.fieldType === "SELECT" ? data.multiSelect : false,
    data.fieldType === "SELECT" ? options : undefined
  );
  await prisma.auditLog.create({
    data: {
      actorId: staff.id,
      action: "ATTRIBUTE_CREATE",
      entity: "CustomAttribute",
      entityId: String(created.id),
      detail: `${created.name}${data.nameAr ? " / " + data.nameAr : ""} [${created.section}/${created.fieldType}] ${scope.subcategoryId != null ? `subcategory=${scope.subcategoryId}` : `category=${scope.categoryId}`}`,
    },
  });
  return NextResponse.json({ success: true, data: { item: created }, error: null });
}

/**
 * PATCH /api/admin/attributes — edit a field definition (rename / retype /
 * change select options). Renaming does NOT touch ProductCustomValue rows:
 * values stay attached via attributeId, so product data survives renames.
 */
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
  const { id, ...fields } = parsed.data;
  const attribute = await prisma.customAttribute.findUnique({ where: { id } });
  if (!attribute || attribute.isDeleted) {
    return NextResponse.json({ success: false, data: null, error: "Field not found" }, { status: 404 });
  }
  if (fields.name) {
    // Name uniqueness within the attribute's own classification (subcategory
    // or category fallback scope).
    const scope: AttrScope = attribute.subcategoryId != null
      ? { subcategoryId: attribute.subcategoryId }
      : { categoryId: attribute.categoryId ?? -1, subcategoryId: null };
    const clash = await prisma.customAttribute.findMany({
      where: { ...scope, isDeleted: false, id: { not: id } },
      select: { name: true },
    });
    if (clash.some((a) => a.name.toLowerCase() === fields.name!.toLowerCase())) {
      return NextResponse.json(
        { success: false, data: null, error: `Field "${fields.name}" already exists in this classification` },
        { status: 409 }
      );
    }
  }
  const effectiveType = fields.fieldType ?? attribute.fieldType;
  const data: { name?: string; fieldType?: typeof fields.fieldType; options?: string[] } = {};
  if (fields.name) data.name = fields.name;
  if (fields.fieldType) data.fieldType = fields.fieldType;
  const options = fields.options ? normalizeOptions(fields.options) : undefined;
  if (options) {
    data.options = effectiveType === "SELECT" ? options.map((o) => o.en) : [];
  } else if (data.fieldType && data.fieldType !== "SELECT") {
    data.options = [];
  }
  const updated = await prisma.customAttribute.update({ where: { id }, data });
  await persistAttributeI18n(
    id,
    fields.nameAr,
    effectiveType === "SELECT" ? fields.multiSelect : false,
    effectiveType === "SELECT" ? options : options // non-SELECT drops options entirely, so labels go too
  );
  await prisma.auditLog.create({
    data: {
      actorId: staff.id,
      action: "ATTRIBUTE_UPDATE",
      entity: "CustomAttribute",
      entityId: String(id),
      detail: Object.keys(data).join(",") + (fields.nameAr !== undefined ? ",nameAr" : "") + (fields.multiSelect !== undefined ? ",multiSelect" : ""),
    },
  });
  return NextResponse.json({ success: true, data: { item: updated }, error: null });
}

/**
 * DELETE /api/admin/attributes?id=X — soft-deletes the field definition.
 * The field disappears from product forms/APIs for that subcategory, but
 * existing per-product values are retained in ProductCustomValue rows so
 * historical data is not destroyed.
 */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return forbidden();
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ success: false, data: null, error: "Invalid id" }, { status: 400 });
  }
  const attribute = await prisma.customAttribute.findUnique({ where: { id } });
  if (!attribute || attribute.isDeleted) {
    return NextResponse.json({ success: false, data: null, error: "Field not found" }, { status: 404 });
  }
  await prisma.customAttribute.update({ where: { id }, data: { isDeleted: true } });
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "ATTRIBUTE_DELETE",
      entity: "CustomAttribute",
      entityId: String(id),
      detail: attribute.name,
    },
  });
  return NextResponse.json({ success: true, data: { deleted: id }, error: null });
}
