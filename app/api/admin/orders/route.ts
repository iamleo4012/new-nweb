import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PACKING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
] as const;

const patchSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(STATUSES),
  note: z.string().max(500).optional().default(""),
});

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

function serializeOrder(o: {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  notes: string;
  status: string;
  subtotal: unknown;
  shipping: unknown;
  total: unknown;
  currency: string;
  createdAt: Date;
  items: { slug: string; name: string; price: unknown; quantity: number }[];
}) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    customerPhone: o.customerPhone,
    address: o.address,
    city: o.city,
    notes: o.notes,
    status: o.status,
    subtotal: Number(o.subtotal),
    shipping: Number(o.shipping),
    total: Number(o.total),
    currency: o.currency,
    createdAt: o.createdAt,
    items: o.items.map((i) => ({ slug: i.slug, name: i.name, price: Number(i.price), quantity: i.quantity })),
  };
}

export async function GET(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return forbidden();
  const status = req.nextUrl.searchParams.get("status");
  const where = status && (STATUSES as readonly string[]).includes(status) ? { status: status as (typeof STATUSES)[number] } : {};
  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { id: "desc" },
    take: 200,
  });
  return NextResponse.json({ success: true, data: { orders: orders.map(serializeOrder) }, error: null });
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
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: "Invalid input" }, { status: 400 });
  }
  const existing = await prisma.order.findUnique({ where: { id: parsed.data.id } });
  if (!existing) {
    return NextResponse.json({ success: false, data: null, error: "Order not found" }, { status: 404 });
  }
  const updated = await prisma.order.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.status,
      statusHistory: { create: { status: parsed.data.status, note: parsed.data.note } },
    },
    include: { items: true },
  });
  await prisma.auditLog.create({
    data: {
      actorId: staff.id,
      action: "ORDER_STATUS_CHANGE",
      entity: "Order",
      entityId: String(updated.id),
      detail: `${existing.status} -> ${parsed.data.status}`,
    },
  });
  return NextResponse.json({ success: true, data: { order: serializeOrder(updated) }, error: null });
}
