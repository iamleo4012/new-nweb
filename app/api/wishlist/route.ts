import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const addSchema = z.object({ slug: z.string().min(1) });

function unauthorized() {
  return NextResponse.json({ success: false, data: null, error: "Not authenticated" }, { status: 401 });
}

async function wishlistPayload(userId: number) {
  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    include: { product: true },
    orderBy: { id: "asc" },
  });
  return items.map((i) => ({
    id: i.product.slug,
    name: i.product.name,
    image: i.product.image,
    price: Number(i.product.price),
    currency: i.product.currency,
    line: i.product.line,
    sku: i.product.sku,
  }));
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const items = await wishlistPayload(user.id);
  return NextResponse.json({ success: true, data: { items }, error: null });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: "Invalid input" }, { status: 400 });
  }
  const product = await prisma.product.findUnique({ where: { slug: parsed.data.slug } });
  if (!product || !product.isActive) {
    return NextResponse.json({ success: false, data: null, error: "Product not found" }, { status: 404 });
  }
  await prisma.wishlistItem.upsert({
    where: { userId_productId: { userId: user.id, productId: product.id } },
    create: { userId: user.id, productId: product.id },
    update: {},
  });
  const items = await wishlistPayload(user.id);
  return NextResponse.json({ success: true, data: { items }, error: null });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const slug = req.nextUrl.searchParams.get("slug");
  if (slug) {
    const product = await prisma.product.findUnique({ where: { slug } });
    if (product) {
      await prisma.wishlistItem.deleteMany({ where: { userId: user.id, productId: product.id } });
    }
  } else {
    await prisma.wishlistItem.deleteMany({ where: { userId: user.id } });
  }
  const items = await wishlistPayload(user.id);
  return NextResponse.json({ success: true, data: { items }, error: null });
}
