/**
 * reassign-warehouse-categories.mjs — approved Stage-1 product reassignment
 * (2026-09-01). Moves 17 real products out of the catch-all "Warehouse
 * Equipment" category into the two purpose-built categories created in
 * fd30420, so the storefront pages built for those categories finally
 * receive their products.
 *
 * Mapping (approved by the owner, itemized):
 *   -> "Forklifts & Pallets": Heavy Duty Forklift, Electric Forklift 2000kg,
 *      Diesel Forklift 3000kg, Compact Electric Forklift, Reach Truck
 *      Forklift, Order Picker, Plastic Pallet Standard, Wooden Pallet Heavy
 *      Duty, Industrial Plastic Pallet, Export Wooden Pallet
 *   -> "Heavy Duty Racking": Heavy Duty Racking System, Industrial Storage
 *      Rack, Pallet Racking System, Cantilever Rack, Drive-In Racking,
 *      Mezzanine Floor System, Selective Pallet Rack
 *   Unchanged by decision: Mobile Shelving Unit (Warehouse Equipment),
 *      Eco-Friendly Cleaning Tool Set (Home Care)
 *
 * IDEMPOTENT: looks products up by exact name; already-moved products are
 * skipped. In production the change was applied through the audited admin
 * API (17 PRODUCT_UPDATE audit entries); this script reproduces the same
 * category-only assignment for fresh environments.
 *
 * Run:  node scripts/reassign-warehouse-categories.mjs
 * Rollback (reverse mapping):
 *   node -e "..." — or simply re-run the inverse: set categoryId back to the
 *   "Warehouse Equipment" category for these product names.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MAPPING = {
  "Forklifts & Pallets": [
    "Heavy Duty Forklift", "Electric Forklift 2000kg", "Diesel Forklift 3000kg",
    "Compact Electric Forklift", "Reach Truck Forklift", "Order Picker",
    "Plastic Pallet Standard", "Wooden Pallet Heavy Duty",
    "Industrial Plastic Pallet", "Export Wooden Pallet",
  ],
  "Heavy Duty Racking": [
    "Heavy Duty Racking System", "Industrial Storage Rack", "Pallet Racking System",
    "Cantilever Rack", "Drive-In Racking", "Mezzanine Floor System", "Selective Pallet Rack",
  ],
};

async function main() {
  for (const [categoryName, productNames] of Object.entries(MAPPING)) {
    const category = await prisma.category.findFirst({ where: { name: categoryName }, select: { id: true } });
    if (!category) {
      console.error(`✗ category "${categoryName}" not found — run add-missing-categories.mjs first`);
      process.exitCode = 1;
      continue;
    }
    for (const name of productNames) {
      const product = await prisma.product.findFirst({ where: { name }, select: { id: true, categoryId: true } });
      if (!product) {
        console.warn(`? product "${name}" not found — skipped`);
        continue;
      }
      if (product.categoryId === category.id) {
        console.log(`= ${name}: already in ${categoryName}`);
        continue;
      }
      await prisma.product.update({ where: { id: product.id }, data: { categoryId: category.id } });
      console.log(`→ ${name}: moved to ${categoryName}`);
    }
  }
  const counts = await prisma.category.findMany({
    where: { name: { in: ["Forklifts & Pallets", "Heavy Duty Racking", "Warehouse Equipment"] } },
    select: { name: true, _count: { select: { products: true } } },
  });
  counts.forEach((c) => console.log(`${c.name}: ${c._count.products} products`));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
