import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const departments = await prisma.department.findMany({
    include: {
      categories: {
        include: { _count: { select: { products: { where: { isActive: true } } } } },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({
    success: true,
    data: departments.map((d) => ({
      slug: d.slug,
      name: d.name,
      purchaseMode: d.purchaseMode,
      categories: d.categories.map((c) => ({
        slug: c.slug,
        name: c.name,
        productCount: c._count.products,
      })),
    })),
    error: null,
  });
}
