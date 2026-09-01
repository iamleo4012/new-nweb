/**
 * add-missing-categories.mjs — Stage 1 of the admin product-structure
 * reconciliation (2026-09-01).
 *
 * The storefront's static listing pages select products by CATEGORY NAME via
 * /api/catalog. Three of those pages filtered on names that had no matching
 * row in the Category table, so they rendered zero products and the admin
 * form could not assign anything to them:
 *
 *   houseware-home-outdoor.html        -> "Home & Outdoor"
 *   warehouse-forklifts-pallets.html   -> "Forklifts & Pallets"
 *   warehouse-heavy-duty-racking.html  -> "Heavy Duty Racking"
 *
 * This script is IDEMPOTENT: it upserts the three categories under their
 * correct departments and is safe to re-run on any environment (fresh
 * databases, restores). The production rows were originally created through
 * the audited admin API (HIER_CREATE audit entries, category ids 59-61);
 * this script reproduces the same result for new environments.
 *
 * Run:  node scripts/add-missing-categories.mjs
 *
 * Rollback (remove the rows again — they carry no products until the
 * separately-approved reassignment happens):
 *   node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.category.deleteMany({where:{slug:{in:['home-outdoor','forklifts-pallets','heavy-duty-racking']}}}).then(r=>{console.log('deleted',r.count);return p.\$disconnect()})"
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// departmentSlug mirrors the storefront hub the category belongs under.
// "warehouse" is the DB slug of the department named "Supermarket & Warehouse".
const TARGETS = [
  { name: "Home & Outdoor", slug: "home-outdoor", departmentSlug: "houseware" },
  { name: "Forklifts & Pallets", slug: "forklifts-pallets", departmentSlug: "warehouse" },
  { name: "Heavy Duty Racking", slug: "heavy-duty-racking", departmentSlug: "warehouse" },
];

async function main() {
  for (const t of TARGETS) {
    const dept = await prisma.department.findUnique({ where: { slug: t.departmentSlug } });
    if (!dept) {
      console.error(`✗ department "${t.departmentSlug}" not found — seed departments first`);
      process.exitCode = 1;
      continue;
    }
    const existing = await prisma.category.findUnique({ where: { slug: t.slug } });
    if (existing) {
      // Repair drift only: a same-slug category under the wrong department
      // would break the storefront page's product assignment.
      if (existing.departmentId !== dept.id) {
        await prisma.category.update({ where: { id: existing.id }, data: { departmentId: dept.id } });
        console.log(`↻ ${t.name}: moved to department "${dept.name}"`);
      } else {
        console.log(`= ${t.name}: already present under "${dept.name}"`);
      }
      continue;
    }
    const created = await prisma.category.create({
      data: { name: t.name, slug: t.slug, departmentId: dept.id },
    });
    console.log(`+ ${t.name} (id ${created.id}) created under "${dept.name}"`);
  }
  const total = await prisma.category.count();
  console.log(`categories total: ${total}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
