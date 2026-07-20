import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and dashes"),
  name: z.string().min(2).max(200),
  description: z.string().max(5000).optional().default(""),
  price: z.number().min(0).max(999999),
  stock: z.number().int().min(0).max(1000000).optional().default(0),
  categoryId: z.number().int().positive(),
  image: z.string().max(1000).optional().default(""),
  line: z.string().max(100).optional().default(""),
  sku: z.string().max(100).optional().default(""),
  isActive: z.boolean().optional().default(true),
});

const updateSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(5000).optional(),
  price: z.number().min(0).max(999999).optional(),
  stock: z.number().int().min(0).max(1000000).optional(),
  categoryId: z.number().int().positive().optional(),
  image: z.string().max(1000).optional(),
  line: z.string().max(100).optional(),
  sku: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
});

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

function serialize(p: {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: unknown;
  currency: string;
  image: string;
  line: string;
  sku: string;
  stock: number;
  isActive: boolean;
  categoryId: number;
  category: { name: string };
}) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    price: Number(p.price),
    currency: p.currency,
    image: p.image,
    line: p.line,
    sku: p.sku,
    stock: p.stock,
    isActive: p.isActive,
    categoryId: p.categoryId,
    category: p.category.name,
  };
}

export async function GET() {
  const staff = await requireStaff();
  if (!staff) return forbidden();
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ include: { category: true }, orderBy: { id: "asc" } }),
    prisma.category.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, slug: true } }),
  ]);
  return NextResponse.json({
    success: true,
    data: { products: products.map(serialize), categories },
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
  const dup = await prisma.product.findUnique({ where: { slug: parsed.data.slug } });
  if (dup) {
    return NextResponse.json({ success: false, data: null, error: "Slug already exists" }, { status: 409 });
  }
  const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
  if (!category) {
    return NextResponse.json({ success: false, data: null, error: "Category not found" }, { status: 400 });
  }
  const created = await prisma.product.create({
    data: parsed.data,
    include: { category: true },
  });
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
    return NextResponse.json({ success: false, data: null, error: "Invalid input" }, { status: 400 });
  }
  const { id, ...fields } = parsed.data;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ success: false, data: null, error: "Product not found" }, { status: 404 });
  }
  const updated = await prisma.product.update({ where: { id }, data: fields, include: { category: true } });
  await prisma.auditLog.create({
    data: { actorId: staff.id, action: "PRODUCT_UPDATE", entity: "Product", entityId: String(id), detail: Object.keys(fields).join(",") },
  });
  return NextResponse.json({ success: true, data: { product: serialize(updated) }, error: null });
}

export async function DELETE(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return forbidden();
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ success: false, data: null, error: "Invalid id" }, { status: 400 });
  }
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ success: false, data: null, error: "Product not found" }, { status: 404 });
  }
  const updated = await prisma.product.update({ where: { id }, data: { isActive: false }, include: { category: true } });
  await prisma.auditLog.create({
    data: { actorId: staff.id, action: "PRODUCT_DEACTIVATE", entity: "Product", entityId: String(id), detail: existing.slug },
  });
  return NextResponse.json({ success: true, data: { product: serialize(updated) }, error: null });
}
