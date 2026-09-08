import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

const slugField = z.string().min(2).max(120).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, dashes");

const schemas = {
  departments: {
    create: z.object({
      slug: slugField,
      name: z.string().min(1).max(200),
      purchaseMode: z.enum(["ONLINE", "INQUIRY"]).optional().default("ONLINE"),
    }),
    update: z.object({
      id: z.number().int().positive(),
      slug: slugField.optional(),
      name: z.string().min(1).max(200).optional(),
      purchaseMode: z.enum(["ONLINE", "INQUIRY"]).optional(),
    }),
  },
  sections: {
    create: z.object({
      slug: slugField,
      name: z.string().min(1).max(200),
      departmentId: z.number().int().positive(),
    }),
    update: z.object({
      id: z.number().int().positive(),
      slug: slugField.optional(),
      name: z.string().min(1).max(200).optional(),
      departmentId: z.number().int().positive().optional(),
    }),
  },
  categories: {
    create: z.object({
      slug: slugField,
      name: z.string().min(1).max(200),
      departmentId: z.number().int().positive(),
      sectionId: z.number().int().positive().nullable().optional(),
    }),
    update: z.object({
      id: z.number().int().positive(),
      slug: slugField.optional(),
      name: z.string().min(1).max(200).optional(),
      departmentId: z.number().int().positive().optional(),
      sectionId: z.number().int().positive().nullable().optional(),
    }),
  },
  subcategories: {
    create: z.object({
      slug: slugField,
      name: z.string().min(1).max(200),
      categoryId: z.number().int().positive(),
    }),
    update: z.object({
      id: z.number().int().positive(),
      slug: slugField.optional(),
      name: z.string().min(1).max(200).optional(),
      categoryId: z.number().int().positive().optional(),
    }),
  },
};

type HierarchyEntity = keyof typeof schemas;

function isEntity(value: string): value is HierarchyEntity {
  return value in schemas;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return forbidden();
  const { entity } = await params;
  if (!isEntity(entity)) {
    return NextResponse.json({ success: false, data: null, error: "Unknown entity" }, { status: 404 });
  }

  let items: unknown[] = [];
  if (entity === "departments") {
    items = await prisma.department.findMany({ orderBy: { name: "asc" } });
  } else if (entity === "sections") {
    items = await prisma.section.findMany({ orderBy: { name: "asc" }, include: { department: { select: { id: true, name: true } } } });
  } else if (entity === "categories") {
    items = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { department: { select: { id: true, name: true } }, section: { select: { id: true, name: true } } },
    });
  } else if (entity === "subcategories") {
    items = await prisma.subcategory.findMany({
      orderBy: { name: "asc" },
      include: { category: { select: { id: true, name: true } } },
    });
  }
  return NextResponse.json({ success: true, data: { items }, error: null });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return forbidden();
  const { entity } = await params;
  if (!isEntity(entity)) {
    return NextResponse.json({ success: false, data: null, error: "Unknown entity" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = schemas[entity].create.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  let created: { id: number; slug: string };
  if (entity === "departments") {
    const dup = await prisma.department.findUnique({ where: { slug: parsed.data.slug } });
    if (dup) return NextResponse.json({ success: false, data: null, error: "Slug already exists" }, { status: 409 });
    created = await prisma.department.create({ data: parsed.data });
  } else if (entity === "sections") {
    const data = parsed.data as { slug: string; name: string; departmentId: number };
    const dup = await prisma.section.findUnique({ where: { slug: data.slug } });
    if (dup) return NextResponse.json({ success: false, data: null, error: "Slug already exists" }, { status: 409 });
    created = await prisma.section.create({ data });
  } else if (entity === "categories") {
    const data = parsed.data as { slug: string; name: string; departmentId: number; sectionId?: number | null };
    const dup = await prisma.category.findUnique({ where: { slug: data.slug } });
    if (dup) return NextResponse.json({ success: false, data: null, error: "Slug already exists" }, { status: 409 });
    created = await prisma.category.create({
      data: { slug: data.slug, name: data.name, departmentId: data.departmentId, sectionId: data.sectionId ?? null },
    });
  } else {
    const data = parsed.data as { slug: string; name: string; categoryId: number };
    const dup = await prisma.subcategory.findUnique({ where: { slug: data.slug } });
    if (dup) return NextResponse.json({ success: false, data: null, error: "Slug already exists" }, { status: 409 });
    created = await prisma.subcategory.create({ data });
  }

  await prisma.auditLog.create({
    data: { actorId: admin.id, action: "HIER_CREATE", entity, entityId: String(created.id), detail: created.slug },
  });
  return NextResponse.json({ success: true, data: { item: created }, error: null });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return forbidden();
  const { entity } = await params;
  if (!isEntity(entity)) {
    return NextResponse.json({ success: false, data: null, error: "Unknown entity" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = schemas[entity].update.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: "Invalid input" }, { status: 400 });
  }

  const { id, ...fields } = parsed.data as { id: number } & Record<string, unknown>;

  let updated: { id: number };
  if (entity === "departments") {
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, data: null, error: "Not found" }, { status: 404 });
    updated = await prisma.department.update({ where: { id }, data: fields });
  } else if (entity === "sections") {
    const existing = await prisma.section.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, data: null, error: "Not found" }, { status: 404 });
    updated = await prisma.section.update({ where: { id }, data: fields });
  } else if (entity === "categories") {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, data: null, error: "Not found" }, { status: 404 });
    updated = await prisma.category.update({ where: { id }, data: fields });
  } else {
    const existing = await prisma.subcategory.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, data: null, error: "Not found" }, { status: 404 });
    updated = await prisma.subcategory.update({ where: { id }, data: fields });
  }

  await prisma.auditLog.create({
    data: { actorId: admin.id, action: "HIER_UPDATE", entity, entityId: String(id), detail: Object.keys(fields).join(",") },
  });
  return NextResponse.json({ success: true, data: { item: updated }, error: null });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  // Deleting hierarchy records (departments/sections/categories/subcategories)
  // is a destructive action that can cascade to products.
  const admin = await requireAdmin();
  if (!admin) return forbidden();
  const { entity } = await params;
  if (!isEntity(entity)) {
    return NextResponse.json({ success: false, data: null, error: "Unknown entity" }, { status: 404 });
  }
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ success: false, data: null, error: "Invalid id" }, { status: 400 });
  }

  try {
    if (entity === "departments") {
      await prisma.department.delete({ where: { id } });
    } else if (entity === "sections") {
      await prisma.section.delete({ where: { id } });
    } else if (entity === "categories") {
      await prisma.category.delete({ where: { id } });
    } else {
      await prisma.subcategory.delete({ where: { id } });
    }
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Cannot delete: record is in use" },
      { status: 409 }
    );
  }

  await prisma.auditLog.create({
    data: { actorId: admin.id, action: "HIER_DELETE", entity, entityId: String(id), detail: "" },
  });
  return NextResponse.json({ success: true, data: { deleted: id }, error: null });
}
