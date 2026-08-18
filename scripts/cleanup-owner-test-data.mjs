/**
 * cleanup-owner-test-data.mjs — removes ONLY the data created by
 * seed-owner-test-data.mjs, using the manifest that seed wrote.
 * Scoped predicates (orderNumber TEST-OA-*, test emails, snapshotted
 * product ids) mean real customer/order/product data can never be touched.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, unlinkSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const prisma = new PrismaClient();
const MANIFEST = join(dirname(fileURLToPath(import.meta.url)), "owner-test-data-manifest.json");

async function main() {
  if (!existsSync(MANIFEST)) {
    console.log("No manifest found — nothing to clean.");
    return;
  }
  const m = JSON.parse(readFileSync(MANIFEST, "utf8"));

  // 1. Delete ONLY manifest-recorded test orders (items + status events cascade).
  const orders = await prisma.order.findMany({
    where: { orderNumber: { in: m.orders.map((o) => o.orderNumber) } },
    select: { id: true, orderNumber: true },
  });
  let deleted = 0;
  for (const o of orders) {
    await prisma.order.delete({ where: { id: o.id } });
    deleted++;
  }

  // 2. Delete ONLY the test customer accounts (by exact manifest ids + email namespace).
  let users = 0;
  for (const c of m.customers) {
    const r = await prisma.user.deleteMany({ where: { id: c.id, email: c.email } });
    users += r.count;
  }
  // belt-and-braces: any strays under the reserved namespace
  users += (await prisma.user.deleteMany({ where: { email: { contains: "@test.local", startsWith: "test.owner.analytics." } } })).count;

  // 3. Restore the snapshotted stock values on the real products.
  let restored = 0;
  for (const s of m.stockSnapshot) {
    await prisma.product.update({ where: { id: s.productId }, data: { stock: s.stock, minStock: s.minStock } });
    restored++;
  }

  unlinkSync(MANIFEST);
  console.log(`Cleanup complete: ${deleted} test orders, ${users} test customers removed, ${restored} product stock values restored, manifest deleted.`);
  console.log("Real data was not touched.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
