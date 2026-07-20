import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type MasterEntity =
  | "brands"
  | "materials"
  | "colors"
  | "sizes"
  | "suppliers"
  | "units"
  | "countries"
  | "taxes";

const ENTITY_CONFIG: Record<
  MasterEntity,
  {
    model: keyof Prisma.TransactionClient;
    schema: z.ZodObject<Record<string, z.ZodTypeAny>>;
    defaultOrderBy?: string;
  }
> = {
  brands: {
    model: "brand",
    schema: z.object({
      slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
      name: z.string().min(1).max(200),
    }),
  },
  materials: {
    model: "material",
    schema: z.object({
      slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
      name: z.string().min(1).max(200),
    }),
  },
  colors: {
    model: "color",
    schema: z.object({
      slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
      name: z.string().min(1).max(100),
      hex: z.string().max(20).optional().default(""),
    }),
  },
  sizes: {
    model: "size",
    schema: z.object({
      slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
      name: z.string().min(1).max(100),
    }),
  },
  suppliers: {
    model: "supplier",
    schema: z.object({
      slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
      name: z.string().min(1).max(200),
      contact: z.string().max(200).optional().default(""),
      phone: z.string().max(50).optional().default(""),
      email: z.string().max(200).optional().default(""),
    }),
  },
  units: {
    model: "unit",
    schema: z.object({
      slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
      name: z.string().min(1).max(50),
    }),
  },
  countries: {
    model: "country",
    schema: z.object({
      slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
      name: z.string().min(1).max(100),
    }),
  },
  taxes: {
    model: "tax",
    schema: z.object({
      slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
      name: z.string().min(1).max(100),
      rate: z.number().min(0).max(1000),
    }),
  },
};

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

function isMasterEntity(value: string): value is MasterEntity {
  return value in ENTITY_CONFIG;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const staff = await requireStaff();
  if (!staff) return forbidden();

  const { entity } = await params;
  if (!isMasterEntity(entity)) {
    return NextResponse.json({ success: false, data: null, error: "Unknown entity" }, { status: 404 });
  }

  const cfg = ENTITY_CONFIG[entity];
  const delegate = (prisma as unknown as Record<string, { findMany: (args?: unknown) => Promise<unknown[]> }>)[
    cfg.model as string
  ];
  const items = await delegate.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ success: true, data: { items }, error: null });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const staff = await requireStaff();
  if (!staff) return forbidden();

  const { entity } = await params;
  if (!isMasterEntity(entity)) {
    return NextResponse.json({ success: false, data: null, error: "Unknown entity" }, { status: 404 });
  }
  const cfg = ENTITY_CONFIG[entity];

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = cfg.schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const delegate = (prisma as unknown as Record<string, {
    findUnique: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<unknown>;
  }>)[cfg.model as string];

  const dup = await delegate.findUnique({ where: { slug: parsed.data.slug } });
  if (dup) {
    return NextResponse.json({ success: false, data: null, error: "Slug already exists" }, { status: 409 });
  }

  const created = await delegate.create({ data: parsed.data });
  await prisma.auditLog.create({
    data: {
      actorId: staff.id,
      action: "MASTER_CREATE",
      entity: cfg.model as string,
      entityId: String((created as { id: number }).id),
      detail: parsed.data.slug,
    },
  });
  return NextResponse.json({ success: true, data: { item: created }, error: null });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const staff = await requireStaff();
  if (!staff) return forbidden();

  const { entity } = await params;
  if (!isMasterEntity(entity)) {
    return NextResponse.json({ success: false, data: null, error: "Unknown entity" }, { status: 404 });
  }
  const cfg = ENTITY_CONFIG[entity];

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid JSON body" }, { status: 400 });
  }
  const updateSchema = cfg.schema.partial().extend({ id: z.number().int().positive() });
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: "Invalid input" }, { status: 400 });
  }

  const { id, ...fields } = parsed.data;
  const delegate = (prisma as unknown as Record<string, {
    findUnique: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
  }>)[cfg.model as string];

  const existing = await delegate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ success: false, data: null, error: "Item not found" }, { status: 404 });
  }

  const updated = await delegate.update({ where: { id }, data: fields });
  await prisma.auditLog.create({
    data: {
      actorId: staff.id,
      action: "MASTER_UPDATE",
      entity: cfg.model as string,
      entityId: String(id),
      detail: Object.keys(fields).join(","),
    },
  });
  return NextResponse.json({ success: true, data: { item: updated }, error: null });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const staff = await requireStaff();
  if (!staff) return forbidden();

  const { entity } = await params;
  if (!isMasterEntity(entity)) {
    return NextResponse.json({ success: false, data: null, error: "Unknown entity" }, { status: 404 });
  }
  const cfg = ENTITY_CONFIG[entity];

  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ success: false, data: null, error: "Invalid id" }, { status: 400 });
  }

  const delegate = (prisma as unknown as Record<string, {
    findUnique: (args: unknown) => Promise<unknown>;
    delete: (args: unknown) => Promise<unknown>;
  }>)[cfg.model as string];

  const existing = await delegate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ success: false, data: null, error: "Item not found" }, { status: 404 });
  }

  try {
    await delegate.delete({ where: { id } });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Cannot delete: record is in use by products" },
      { status: 409 }
    );
  }

  await prisma.auditLog.create({
    data: {
      actorId: staff.id,
      action: "MASTER_DELETE",
      entity: cfg.model as string,
      entityId: String(id),
      detail: (existing as { slug: string }).slug,
    },
  });
  return NextResponse.json({ success: true, data: { deleted: id }, error: null });
}
