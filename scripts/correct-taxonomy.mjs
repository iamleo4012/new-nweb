/**
 * correct-taxonomy.mjs — enforce the authoritative Master Data taxonomy.
 *
 * Structure enforced (display names; slugs in parentheses where they differ):
 *
 * HOUSEWARE
 *   Cleaning Tools (Surface Cleaning, Toilet & Drain)
 *   Home & Outdoor (Laundry Essentials, Storage and Packaging, Picnic Collection)
 *   Kitchenware (Cutlery & Cleaver, Cooking & Utensils, Drinkware)
 * SUPERMARKET
 *   Cooling Appliances (Freezer, Cooler & Chiller — kept per owner decision)
 *   Trolleys & Baskets (Trolleys·trolly, Baskets·basket)
 *   Shelves & Stands (Shelves, Stands)
 *   Checkout Solutions — no subcategories
 *   Accessories — no subcategories
 * WAREHOUSE
 *   Trolleys & Baskets·warehouse-trolleys-baskets (Trolleys·trolleys, Baskets·baskets)
 *   Forklifts & Pallets (Forklifts·forklift, Pallets·pallet)
 *   Heavy Duty Racking — no subcategories
 *
 * Product moves (approved):
 *   minimalist-table-spoon      → Houseware → Kitchenware → Cutlery & Cleaver
 *   artisan-ceramic-pitcher     → Houseware → Kitchenware → Drinkware
 *   eco-friendly-cleaning-tool-set → Houseware → Home & Outdoor (no subcategory)
 *   mobile-shelving-unit        → Warehouse → Heavy Duty Racking
 *   industrial-cage-trolley     → Warehouse → Trolleys & Baskets → Trolleys
 *   heavy-duty-platform-trolley → Warehouse → Trolleys & Baskets → Trolleys
 *   basket-liner-pack           → subcategory link removed (invalid cross-category ref)
 *
 * Deliberately NOT touched: Freezer/Cooler & Chiller subs; products 58/61/57
 * (foldable-hand-trolley, light-duty-service-trolley, wire-mesh-basket-trolley)
 * pending the owner's department decision; inactive E2E products; Cold Room and
 * Customised Packaging (storefront-only concepts, no DB records).
 *
 * The script is idempotent — every step verifies the current state first and
 * skips what is already correct, so a partial run can simply be re-run.
 * Run: node --env-file=.env scripts/correct-taxonomy.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const performed = [];

async function audit(action, entity, entityId, detail) {
  await prisma.auditLog.create({ data: { actorId: null, action, entity, entityId, detail } });
  performed.push(`${action} ${entity}#${entityId}: ${detail}`);
}

async function main() {
  // ---------- 1. Create Warehouse → Trolleys & Baskets ----------
  const warehouse = await prisma.department.findUnique({ where: { slug: "warehouse" } });
  if (!warehouse) throw new Error("warehouse department missing — aborting");

  let whTb = await prisma.category.findUnique({ where: { slug: "warehouse-trolleys-baskets" } });
  if (!whTb) {
    whTb = await prisma.category.create({
      data: { slug: "warehouse-trolleys-baskets", name: "Trolleys & Baskets", departmentId: warehouse.id },
    });
    await audit("TAXONOMY_CREATE", "Category", String(whTb.id), `Trolleys & Baskets (warehouse-trolleys-baskets) under department warehouse#${warehouse.id}`);
  }

  // ---------- 2. Warehouse T&B subcategories (plural slugs are free; plural page buttons expect them) ----------
  let whTrolleys = await prisma.subcategory.findUnique({ where: { slug: "trolleys" } });
  if (!whTrolleys) {
    whTrolleys = await prisma.subcategory.create({ data: { slug: "trolleys", name: "Trolleys", categoryId: whTb.id } });
    await audit("TAXONOMY_CREATE", "Subcategory", String(whTrolleys.id), `Trolleys (trolleys) under category#${whTb.id}`);
  } else if (whTrolleys.categoryId !== whTb.id) {
    throw new Error(`subcategory slug 'trolleys' exists under another category (${whTrolleys.categoryId}) — aborting for review`);
  }
  let whBaskets = await prisma.subcategory.findUnique({ where: { slug: "baskets" } });
  if (!whBaskets) {
    whBaskets = await prisma.subcategory.create({ data: { slug: "baskets", name: "Baskets", categoryId: whTb.id } });
    await audit("TAXONOMY_CREATE", "Subcategory", String(whBaskets.id), `Baskets (baskets) under category#${whTb.id}`);
  } else if (whBaskets.categoryId !== whTb.id) {
    throw new Error(`subcategory slug 'baskets' exists under another category (${whBaskets.categoryId}) — aborting for review`);
  }

  // ---------- 3. Rename subcategory display names (slugs preserved — storefront depends on them) ----------
  const renames = [
    { slug: "trolly", from: "Trolly", to: "Trolleys" },
    { slug: "basket", from: "Basket", to: "Baskets" },
    { slug: "forklift", from: "Forklift", to: "Forklifts" },
    { slug: "pallet", from: "Pallet", to: "Pallets" },
  ];
  for (const r of renames) {
    const sub = await prisma.subcategory.findUnique({ where: { slug: r.slug } });
    if (!sub) throw new Error(`subcategory '${r.slug}' missing — aborting`);
    if (sub.name === r.from) {
      await prisma.subcategory.update({ where: { id: sub.id }, data: { name: r.to } });
      await audit("TAXONOMY_RENAME", "Subcategory", String(sub.id), `display name '${r.from}' -> '${r.to}' (slug ${r.slug} unchanged)`);
    } else if (sub.name !== r.to) {
      throw new Error(`subcategory '${r.slug}' has unexpected name '${sub.name}' — aborting for review`);
    }
  }

  // ---------- 4. Product reassignments ----------
  const cat = async (slug) => {
    const c = await prisma.category.findUnique({ where: { slug } });
    if (!c) throw new Error(`category '${slug}' missing — aborting`);
    return c.id;
  };
  const sub = async (slug) => {
    const s = await prisma.subcategory.findUnique({ where: { slug } });
    if (!s) throw new Error(`subcategory '${slug}' missing — aborting`);
    return s.id;
  };
  const moves = [
    { slug: "minimalist-table-spoon", expectCat: "tableware", toCat: "kitchenware", toSub: "cutlery-cleaver" },
    { slug: "artisan-ceramic-pitcher", expectCat: "ceramics", toCat: "kitchenware", toSub: "drinkware" },
    { slug: "eco-friendly-cleaning-tool-set", expectCat: "home-care", toCat: "home-outdoor", toSub: null },
    { slug: "mobile-shelving-unit", expectCat: "warehouse-equipment", toCat: "heavy-duty-racking", toSub: null },
    { slug: "industrial-cage-trolley", expectCat: "trolleys-baskets", toCat: "warehouse-trolleys-baskets", toSub: "trolleys" },
    { slug: "heavy-duty-platform-trolley", expectCat: "trolleys-baskets", toCat: "warehouse-trolleys-baskets", toSub: "trolleys" },
  ];
  for (const m of moves) {
    const product = await prisma.product.findUnique({ where: { slug: m.slug }, include: { category: true } });
    if (!product) throw new Error(`product '${m.slug}' missing — aborting`);
    const toCatId = await cat(m.toCat);
    const toSubId = m.toSub ? await sub(m.toSub) : null;
    if (product.category.slug === m.toCat && product.subcategoryId === toSubId) continue; // already correct
    if (product.category.slug !== m.expectCat) {
      throw new Error(`product '${m.slug}' is in category '${product.category.slug}', expected '${m.expectCat}' — aborting for review`);
    }
    await prisma.product.update({ where: { id: product.id }, data: { categoryId: toCatId, subcategoryId: toSubId } });
    await audit("TAXONOMY_PRODUCT_MOVE", "Product", String(product.id), `${m.slug}: ${product.category.slug} -> ${m.toCat}${m.toSub ? " / " + m.toSub : ""}`);
  }

  // ---------- 5. Remove product 35's invalid cross-category subcategory link ----------
  const liner = await prisma.product.findUnique({ where: { slug: "basket-liner-pack" }, include: { category: true, subcategory: true } });
  if (!liner) throw new Error("product 'basket-liner-pack' missing — aborting");
  if (liner.subcategoryId !== null) {
    if (liner.category.slug !== "accessories") throw new Error("basket-liner-pack not in accessories — aborting for review");
    await prisma.product.update({ where: { id: liner.id }, data: { subcategoryId: null } });
    await audit("TAXONOMY_PRODUCT_MOVE", "Product", String(liner.id), `basket-liner-pack: removed invalid cross-category subcategory '${liner.subcategory?.slug}' (stays in accessories, no subcategory)`);
  }

  // ---------- 6. Delete the four obsolete categories (only when empty) ----------
  const obsolete = ["tableware", "home-care", "ceramics", "warehouse-equipment"];
  for (const slug of obsolete) {
    const c = await prisma.category.findUnique({ where: { slug }, include: { _count: { select: { products: true, subcategories: true } } } });
    if (!c) continue; // already deleted
    if (c._count.products > 0) throw new Error(`category '${slug}' still has ${c._count.products} product(s) — aborting before delete`);
    if (c._count.subcategories > 0) throw new Error(`category '${slug}' still has subcategories — aborting before delete`);
    await prisma.category.delete({ where: { id: c.id } });
    await audit("TAXONOMY_DELETE", "Category", String(c.id), `${slug} deleted (obsolete; emptied by product moves)`);
  }

  // ---------- 7. Final state printout ----------
  const cats = await prisma.category.findMany({
    orderBy: [{ departmentId: "asc" }, { name: "asc" }],
    include: { department: { select: { slug: true } }, subcategories: { orderBy: { name: "asc" } } },
  });
  console.log("=== FINAL TAXONOMY ===");
  for (const c of cats) {
    console.log(`${c.department.slug} / ${c.slug} "${c.name}"${c.subcategories.length ? " -> " + c.subcategories.map((s) => `${s.name}(${s.slug})`).join(", ") : ""}`);
  }
  console.log("\n=== ACTIONS PERFORMED (" + performed.length + ") ===");
  for (const p of performed) console.log(" -", p);
  if (performed.length === 0) console.log(" (none — everything already correct)");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("ABORTED:", e.message);
    await prisma.$disconnect();
    process.exit(1);
  });
