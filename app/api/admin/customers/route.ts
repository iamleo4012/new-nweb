import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

export async function GET(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return forbidden();

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() || "";
  const role = sp.get("role")?.trim() || "";

  const where: Record<string, unknown> = {};
  if (role) where.role = role;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { id: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { orders: true, addresses: true, cartItems: true, wishlist: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      customers: users.map((u) => ({
        ...u,
        orderCount: u._count.orders,
        addressCount: u._count.addresses,
        cartCount: u._count.cartItems,
        wishlistCount: u._count.wishlist,
      })),
      total,
    },
    error: null,
  });
}
