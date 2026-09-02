/**
 * split-supermarket-warehouse.mjs — Split "Supermarket & Warehouse" into
 * separate departments (2026-09-02).
 *
 * The storefront nav has always shown three departments (Houseware,
 * Supermarket, Warehouse) but the database had only two — "Supermarket &
 * Warehouse" was a single merged department. This script separates them to
 * match the actual frontend structure.
 *
 * Frontend evidence (from the home page nav dropdowns):
 *   Supermarket: Cooling Appliances, Trolleys & Baskets, Shelves & Stands,
 *                Checkout Solutions, Accessories
 *   Warehouse:   Trolleys & Baskets, Forklifts & Pallets, Heavy Duty Racking
 *
 * Mapping (category name → department):
 *   → Supermarket (existing dept id=2, renamed):
 *     Checkout Solutions, Cooling Appliances, Shelves & Stands,
 *     Trolleys & Baskets (majority of 17 products are supermarket-type;
 *     both storefront pages filter by category NAME, not department)
 *   → Warehouse (new department):
 *     Forklifts & Pallets, Heavy Duty Racking, Warehouse Equipment
 *
 * NO product data changes — only Category.departmentId reassignments.
 *
 * IDEMPOTENT: re-runs are safe (already-moved categories are skipped).
 * Run:  node scripts/split-supermarket-warehouse.mjs
 *
 * Rollback (reverse the split):
 *   Update the three warehouse categories' departmentId back to 2, then
 *   rename dept 2 back to "Supermarket & Warehouse" (slug: warehouse), and
 *   delete the Warehouse department.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const WAREHOUSE_CATEGORIES = [
  "Forklifts & Pallets",
  "Heavy Duty Racking",
  "Warehouse Equipment",
];

async function main() {
  // 1. Rename existing dept 2 → "Supermarket" (slug: supermarket)
  const smDept = await prisma.department.findUnique({ where: { id: 2 } });
  if (!smDept) {
    console.error("✗ department id=2 not found — database may have been reset");
    process.exitCode = 1;
    return;
  }
  if (smDept.name === "Supermarket") {
    console.log("= department 2 already named 'Supermarket'");
  } else {
    await prisma.department.update({
      where: { id: 2 },
      data: { name: "Supermarket", slug: "supermarket" },
    });
    console.log(`✓ department 2: "${smDept.name}" → "Supermarket" (slug: supermarket)`);
  }

  // 2. Create "Warehouse" department (or find existing)
  let whDept = await prisma.department.findUnique({ where: { slug: "warehouse" } });
  if (!whDept) {
    whDept = await prisma.department.create({
      data: { name: "Warehouse", slug: "warehouse" },
    });
    console.log(`+ "Warehouse" department created (id ${whDept.id})`);
  } else if (whDept.name === "Warehouse") {
    console.log(`= "Warehouse" department already exists (id ${whDept.id})`);
  } else {
    await prisma.department.update({ where: { id: whDept.id }, data: { name: "Warehouse" } });
    console.log(`↻ department ${whDept.id} renamed to "Warehouse"`);
  }

  // 3. Move warehouse categories
  for (const name of WAREHOUSE_CATEGORIES) {
    const cat = await prisma.category.findFirst({ where: { name }, select: { id: true, departmentId: true } });
    if (!cat) { console.warn(`? category "${name}" not found — skipped`); continue; }
    if (cat.departmentId === whDept.id) { console.log(`= ${name}: already in Warehouse`); continue; }
    await prisma.category.update({ where: { id: cat.id }, data: { departmentId: whDept.id } });
    console.log(`→ ${name}: moved to Warehouse`);
  }

  // Summary
  const summary = await prisma.department.findMany({
    include: { categories: { orderBy: { name: "asc" }, select: { name: true, _count: { select: { products: true } } } } },
    orderBy: { id: "asc" },
  });
  for (const d of summary) {
    console.log(`\n${d.name} (${d.slug}):`);
    d.categories.forEach((c) => console.log(`  ${c.name}: ${c._count.products} products`));
  }
  console.log(`\ntotal products: ${await prisma.product.count()}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
