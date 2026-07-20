import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { id: "asc" },
  });

  const catalog = products.map((p) => ({
    id: p.slug,
    name: p.name,
    price: Number(p.price),
    currency: p.currency,
    img: p.image,
    images: p.images,
    description: p.description,
    line: p.line,
    category: p.category.slug,
    sku: p.sku,
    specs: p.specs,
  }));

  const js = `window.NASSIM_PRODUCTS = ${JSON.stringify(catalog)};`;
  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
