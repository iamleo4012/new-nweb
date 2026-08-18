import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStaff, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

const nameField = z.string().trim().min(1, "Field name is required").max(100, "Field name too long");

const createSchema = z.object({
  subcategoryId: z.number().int().positive(),
  name: nameField,
  section: z.enum(["HEADER", "DESCRIPTION", "SPECIFICATIONS"]),
  fieldType: z.enum(["TEXT", "LONG_TEXT", "NUMBER", "SELECT"]).optional().default("TEXT"),
  options: z.array(z.string().trim().min(1).max(100)).max(50).optional().default([]),
});

const updateSchema = z.object({
  id: z.number().int().positive(),
  name: nameField.optional(),
  fieldType: z.enum(["TEXT", "LONG_TEXT", "NUMBER", "SELECT"]).optional(),
  options: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
});

/**
 * GET /api/admin/attributes?subcategoryId=X
 * Lists the dynamic custom fields defined for one subcategory (all three
 * information areas), ordered by area then display order. Soft-deleted
 * fields are hidden.
 */
export async function GET(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return forbidden();
  const subcategoryId = Number(req.nextUrl.searchParams.get("subcategoryId"));
  if (!Number.isInteger(subcategoryId) || subcategoryId <= 0) {
    return NextResponse.json({ success: false, data: null, error: "Invalid subcategoryId" }, { status: 400 });
  }
  const items = await prisma.customAttribute.findMany({
    where: { subcategoryId, isDeleted: false },
    orderBy: [{ section: "asc" }, { displayOrder: "asc" }, { id: "asc" }],
    include: { _count: { select: { values: true } } },
  });
  return NextResponse.json({
    success: true,
    data: {
      items: items.map((a) => ({
        id: a.id,
        name: a.name,
        section: a.section,
        fieldType: a.fieldType,
        options: a.options,
        displayOrder: a.displayOrder,
        valueCount: a._count.values,
      })),
    },
    error: null,
  });
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
  if (data.fieldType === "SELECT" && data.options.length < 1) {
    return NextResponse.json(
      { success: false, data: null, error: "Select fields need at least one option" },
      { status: 400 }
    );
  }
  const subcategory = await prisma.subcategory.findUnique({ where: { id: data.subcategoryId } });
  if (!subcategory) {
    return NextResponse.json({ success: false, data: null, error: "Subcategory not found" }, { status: 400 });
  }
  // Uniqueness is enforced among live (non-deleted) fields of the subcategory,
  // case-insensitive, across all three areas — the admin thinks of field names
  // as one namespace per subcategory.
  const existing = await prisma.customAttribute.findMany({
    where: { subcategoryId: data.subcategoryId, isDeleted: false },
    select: { name: true },
  });
  if (existing.some((a) => a.name.toLowerCase() === data.name.toLowerCase())) {
    return NextResponse.json(
      { success: false, data: null, error: `Field "${data.name}" already exists in this subcategory` },
      { status: 409 }
    );
  }
  const maxOrder = await prisma.customAttribute.findFirst({
    where: { subcategoryId: data.subcategoryId, section: data.section, isDeleted: false },
    orderBy: { displayOrder: "desc" },
    select: { displayOrder: true },
  });
  const created = await prisma.customAttribute.create({
    data: {
      subcategoryId: data.subcategoryId,
      name: data.name,
      section: data.section,
      fieldType: data.fieldType,
      options: data.fieldType === "SELECT" ? data.options : [],
      displayOrder: (maxOrder?.displayOrder ?? -1) + 1,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: staff.id,
      action: "ATTRIBUTE_CREATE",
      entity: "CustomAttribute",
      entityId: String(created.id),
      detail: `${created.name} [${created.section}/${created.fieldType}] subcategory=${data.subcategoryId}`,
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
    const clash = await prisma.customAttribute.findMany({
      where: { subcategoryId: attribute.subcategoryId, isDeleted: false, id: { not: id } },
      select: { name: true },
    });
    if (clash.some((a) => a.name.toLowerCase() === fields.name!.toLowerCase())) {
      return NextResponse.json(
        { success: false, data: null, error: `Field "${fields.name}" already exists in this subcategory` },
        { status: 409 }
      );
    }
  }
  const data: { name?: string; fieldType?: typeof fields.fieldType; options?: string[] } = {};
  if (fields.name) data.name = fields.name;
  if (fields.fieldType) data.fieldType = fields.fieldType;
  if (fields.options) data.options = fields.fieldType === "SELECT" || attribute.fieldType === "SELECT" ? fields.options : [];
  if (data.fieldType && data.fieldType !== "SELECT" && !fields.options) data.options = [];
  const updated = await prisma.customAttribute.update({ where: { id }, data });
  await prisma.auditLog.create({
    data: {
      actorId: staff.id,
      action: "ATTRIBUTE_UPDATE",
      entity: "CustomAttribute",
      entityId: String(id),
      detail: Object.keys(data).join(","),
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
