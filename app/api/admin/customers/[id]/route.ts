import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) return forbidden();

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ success: false, data: null, error: "Invalid id" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ success: false, data: null, error: "Customer not found" }, { status: 404 });
  }

  const [addresses, orders] = await Promise.all([
    prisma.address.findMany({
      where: { userId },
      orderBy: { id: "asc" },
    }),
    prisma.order.findMany({
      where: { OR: [{ userId }, { customerEmail: user.email }] },
      include: { items: true, statusHistory: { orderBy: { createdAt: "asc" } } },
      orderBy: { id: "desc" },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      user,
      addresses: addresses.map((a) => ({ ...a })),
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        subtotal: Number(o.subtotal),
        shipping: Number(o.shipping),
        total: Number(o.total),
        currency: o.currency,
        createdAt: o.createdAt,
        itemCount: o.items.length,
        items: o.items.map((i) => ({
          id: i.id,
          name: i.name,
          slug: i.slug,
          price: Number(i.price),
          quantity: i.quantity,
        })),
        timeline: o.statusHistory.map((h) => ({
          id: h.id,
          status: h.status,
          note: h.note,
          createdAt: h.createdAt,
        })),
      })),
    },
    error: null,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Deactivating a user is a destructive, privilege-sensitive action.
  const admin = await requireAdmin();
  if (!admin) return forbidden();

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ success: false, data: null, error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid JSON body" }, { status: 400 });
  }

  const { isActive } = body as { isActive?: boolean };
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    return NextResponse.json({ success: false, data: null, error: "Customer not found" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: isActive ?? existing.isActive },
    select: { id: true, email: true, name: true, phone: true, role: true, isActive: true },
  });

  await prisma.auditLog.create({
    data: { actorId: admin.id, action: "CUSTOMER_UPDATE", entity: "User", entityId: String(userId), detail: `isActive=${isActive}` },
  });

  return NextResponse.json({ success: true, data: { user: updated }, error: null });
}
