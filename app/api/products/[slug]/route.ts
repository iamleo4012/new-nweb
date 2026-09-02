import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { customFieldsInclude, customFieldsPayload, loadCustomI18n } from "@/lib/custom-fields";
import { variantOptionsFor, type VariantInput } from "@/lib/product-variants";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: { include: { department: true } },
      colors: { include: { color: { select: { name: true } } } },
      ...customFieldsInclude,
    },
  });
  if (!p || !p.isActive) {
    return NextResponse.json({ success: false, data: null, error: "Product not found" }, { status: 404 });
  }
  const i18n = await loadCustomI18n([p.id]);

  // Customer-safe variant options: look up siblings sharing the internal
  // classCode, derive short labels — NEVER expose the classCode itself.
  let variantOptions: Array<{ id: string; label: string; isCurrent: boolean }> = [];
  if (p.classCode) {
    const family = await prisma.product.findMany({
      where: { classCode: p.classCode, isActive: true },
      select: { slug: true, name: true, classCode: true, specs: true, colors: { include: { color: { select: { name: true } } } } },
    });
    const inputs: VariantInput[] = family.map((f) => ({
      slug: f.slug,
      name: f.name,
      classCode: f.classCode,
      specs: f.specs,
      colors: f.colors.map((c) => c.color),
    }));
    const current = inputs.find((x) => x.slug === p.slug);
    if (current) variantOptions = variantOptionsFor(current, inputs);
  }

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
      // Additive: customer-safe sibling options (slug + label only).
      variantOptions,
      // Additive PIM fields (see lib/custom-fields.ts)
      ...customFieldsPayload(p, i18n),
    },
    error: null,
  });
}
