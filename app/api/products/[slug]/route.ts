import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { customFieldsInclude, customFieldsPayload, loadCustomI18n } from "@/lib/custom-fields";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await prisma.product.findUnique({
    where: { slug },
    include: { category: { include: { department: true } }, ...customFieldsInclude },
  });
  if (!p || !p.isActive) {
    return NextResponse.json({ success: false, data: null, error: "Product not found" }, { status: 404 });
  }
  const i18n = await loadCustomI18n([p.id]);
  return NextResponse.json({
    success: true,
    data: {
      id: p.slug,
      name: p.name,
      price: Number(p.price),
      currency: p.currency,
      img: p.image,
      images: p.images,
      description: p.description,
      line: p.line,
      category: p.category.slug,
      purchaseMode: p.category.department.purchaseMode,
      sku: p.sku,
      specs: p.specs,
      stock: p.stock,
      // Additive PIM fields (see lib/custom-fields.ts)
      ...customFieldsPayload(p, i18n),
    },
    error: null,
  });
}
