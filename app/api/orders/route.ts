import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const orderSchema = z.object({
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email().transform((v) => v.toLowerCase()),
  customerPhone: z.string().min(6).max(30),
  address: z.string().min(3).max(500),
  city: z.string().min(2).max(100),
  notes: z.string().max(1000).optional().default(""),
  items: z
    .array(
      z.object({
        slug: z.string().min(1),
        name: z.string().min(1),
        image: z.string().max(1000).optional().default(""),
        price: z.number(),
        qty: z.number().int().min(1).max(999),
      })
    )
    .min(1)
    .max(100),
  shipping: z.number().min(0).max(100),
  currency: z.string().max(10).optional().default("KD"),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid request body" }, { status: 400 });
  }
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "Please fill in all required fields correctly." },
      { status: 400 }
    );
  }
  const input = parsed.data;

  const slugs = Array.from(new Set(input.items.map((i) => i.slug)));
  const products = await prisma.product.findMany({ where: { slug: { in: slugs }, isActive: true } });
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  for (const item of input.items) {
    const product = bySlug.get(item.slug);
    if (!product) {
      return NextResponse.json(
        { success: false, data: null, error: `Product "${item.name}" is no longer available.` },
        { status: 400 }
      );
    }
    if (product.stock < item.qty) {
      return NextResponse.json(
        { success: false, data: null, error: `Insufficient stock for "${product.name}". Only ${product.stock} left.` },
        { status: 400 }
      );
    }
  }

  const user = await getSessionUser();

  try {
    const order = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const orderItems = input.items.map((item) => {
        const product = bySlug.get(item.slug)!;
        const price = Number(product.price);
        subtotal += price * item.qty;
        return {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          image: product.image,
          price: product.price,
          quantity: item.qty,
        };
      });
      const shipping = input.shipping;
      const total = subtotal + shipping;

      const created = await tx.order.create({
        data: {
          orderNumber: `AN-${new Date().getFullYear()}-PENDING`,
          userId: user?.id ?? null,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          address: input.address,
          city: input.city,
          notes: input.notes,
          currency: input.currency,
          subtotal,
          shipping,
          total,
          status: "PENDING",
          items: { create: orderItems },
          statusHistory: { create: { status: "PENDING", note: "Order placed (cash on delivery)" } },
        },
      });

      const orderNumber = `AN-${new Date().getFullYear()}-${String(created.id).padStart(6, "0")}`;
      const updated = await tx.order.update({
        where: { id: created.id },
        data: { orderNumber },
        include: { items: true },
      });

      for (const item of input.items) {
        const product = bySlug.get(item.slug)!;
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: item.qty } },
        });
      }

      return updated;
    });

    return NextResponse.json({
      success: true,
      order: { orderNumber: order.orderNumber },
      data: {
        order: {
          orderNumber: order.orderNumber,
          status: order.status,
          createdAt: order.createdAt,
          currency: order.currency,
          subtotal: Number(order.subtotal),
          shipping: Number(order.shipping),
          total: Number(order.total),
          items: order.items.map((i) => ({
            slug: i.slug,
            name: i.name,
            qty: i.quantity,
            price: Number(i.price),
          })),
        },
      },
      error: null,
    });
  } catch (err) {
    console.error("Order creation failed:", err);
    return NextResponse.json(
      { success: false, data: null, error: "Could not place order. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, data: null, error: "Not authenticated" }, { status: 401 });
  }
  const orders = await prisma.order.findMany({
    where: { OR: [{ userId: user.id }, { customerEmail: user.email }] },
    include: { items: true },
    orderBy: { id: "desc" },
  });
  const payload = orders.map((o) => ({
    orderNumber: o.orderNumber,
    status: o.status,
    createdAt: o.createdAt,
    currency: o.currency,
    subtotal: Number(o.subtotal),
    shipping: Number(o.shipping),
    total: Number(o.total),
    items: o.items.map((i) => ({
      slug: i.slug,
      name: i.name,
      qty: i.quantity,
      quantity: i.quantity,
      price: Number(i.price),
    })),
  }));
  return NextResponse.json({ success: true, orders: payload, data: payload, error: null });
}
