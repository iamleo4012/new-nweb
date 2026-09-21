const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const cats = await p.category.findMany({ where: { name: 'Kitchenware' }, select: { id: true } });
  const prods = await p.product.findMany({
    where: { categoryId: { in: cats.map((c) => c.id) } },
    select: { id: true, sku: true, name: true, price: true, isActive: true },
    orderBy: { id: 'asc' },
  });
  console.log(JSON.stringify(prods.map((x) => ({ id: x.id, sku: x.sku, name: x.name, price: Number(x.price), active: x.isActive }))));
  await p.$disconnect();
})();
