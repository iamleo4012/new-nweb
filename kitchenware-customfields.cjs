const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const cat = await p.category.findUnique({ where: { slug: 'kitchenware' }, select: { id: true } });
  const prods = await p.product.findMany({
    where: { categoryId: cat.id, isActive: true },
    select: { id: true, sku: true, name: true },
    orderBy: { id: 'asc' },
  });
  for (const prod of prods) {
    const values = await p.productCustomValue.findMany({
      where: { productId: prod.id },
      select: { id: true, value: true, attributeId: true, attribute: { select: { name: true, fieldType: true } } },
    });
    const ar = await p.productCustomValueI18n.findMany({ where: { productId: prod.id } });
    const arMap = new Map(ar.map((a) => [a.attributeId, a.valueAr]));
    const rows = values.map((v) => ({ attr: v.attribute.name, en: v.value, ar: arMap.get(v.attributeId) ?? '' }));
    console.log(JSON.stringify({ sku: prod.sku, name: prod.name, fields: rows }));
  }
  await p.$disconnect();
})();
