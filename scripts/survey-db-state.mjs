/**
 * Read-only DB survey: users, orders, products (test-artifact candidates),
 * settings, discount values. No mutations — safe to run any time.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });
  console.log("=== USERS ===");
  for (const u of users) console.log(JSON.stringify(u));

  const orders = await prisma.order.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true, orderNumber: true, customerName: true, customerEmail: true,
      userId: true, status: true, subtotal: true, shipping: true, total: true, createdAt: true,
    },
  });
  console.log("\n=== ORDERS ===");
  for (const o of orders) console.log(JSON.stringify(o));

  const products = await prisma.product.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true, slug: true, name: true, sku: true, price: true, discount: true,
      stock: true, minStock: true, isActive: true, image: true, images: true,
      categoryId: true, createdAt: true, description: true,
    },
  });
  console.log("\n=== PRODUCTS ===");
  for (const p of products) {
    const hasImage = Boolean(p.image) || (p.images && p.images.length > 0);
    console.log(JSON.stringify({
      id: p.id, slug: p.slug, name: p.name, sku: p.sku, price: Number(p.price),
      discount: Number(p.discount), stock: p.stock, minStock: p.minStock,
      isActive: p.isActive, hasImage, categoryId: p.categoryId,
      descLen: (p.description || "").length,
    }));
  }

  const settings = await prisma.setting.findMany();
  console.log("\n=== SETTINGS ===");
  for (const s of settings) console.log(JSON.stringify(s));

  const counts = {
    products: await prisma.product.count(),
    orderItems: await prisma.orderItem.count(),
    stockMovements: await prisma.stockMovement.count(),
    cartItems: await prisma.cartItem.count(),
    wishlist: await prisma.wishlistItem.count(),
    notifications: await prisma.notification.count(),
    auditLogs: await prisma.auditLog.count(),
    orderSecurity: await prisma.orderSecurity.count(),
  };
  console.log("\n=== COUNTS ===");
  console.log(JSON.stringify(counts));

  const discounted = await prisma.product.findMany({
    where: { discount: { not: 0 } },
    select: { id: true, slug: true, discount: true },
  });
  console.log("\n=== PRODUCTS WITH discount != 0 ===");
  for (const p of discounted) console.log(JSON.stringify({ ...p, discount: Number(p.discount) }));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
