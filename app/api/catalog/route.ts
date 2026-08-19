import { prisma } from "@/lib/db";
import { customFieldsInclude, customFieldsPayload, loadCustomI18n } from "@/lib/custom-fields";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true, ...customFieldsInclude },
    orderBy: { id: "asc" },
  });
  // Bilingual (EN/AR) spec metadata + values, bulk-loaded (no N+1).
  const i18n = await loadCustomI18n(products.map((p) => p.id));

  const catalog = products.map((p) => ({
    id: p.slug,
    name: p.name,
    price: Number(p.price),
    currency: p.currency,
    img: p.image,
    images: p.images,
    description: p.description,
    line: p.line,
    category: p.category.name,
    sku: p.sku,
    specs: p.specs,
    // Online-store quantity (manually allocated by the store admin — this is
    // NOT the physical-store ERP inventory). Additive field: consumers that
    // ignore it keep working unchanged.
    stock: p.stock,
    // Additive PIM fields: admin-defined custom info + admin-selected related
    // products. Consumers that ignore them keep working unchanged.
    ...customFieldsPayload(p, i18n),
  }));

  const js = `window.NASSIM_PRODUCTS = ${JSON.stringify(catalog)};
window.NassimGetProduct = function (id) {
  if (!id) return null;
  for (var i = 0; i < window.NASSIM_PRODUCTS.length; i++) {
    if (window.NASSIM_PRODUCTS[i].id === id) return window.NASSIM_PRODUCTS[i];
  }
  return null;
};`;
  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
