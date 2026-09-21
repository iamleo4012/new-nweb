import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const prisma = new PrismaClient();
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

import { existsSync } from "node:fs";

// The hardcoded fallback catalog (products.js) was removed: the storefront
// must never sell fake demo products. Real products are imported through the
// admin panel / admin API. When the file is absent, seeding skips products
// (admin + owner accounts are still created) instead of crashing — this also
// keeps `prisma migrate dev` (which auto-seeds) working on fresh setups.
function loadCatalog() {
  const file = path.join(root, "public", "assets", "js", "products.js");
  if (!existsSync(file)) {
    console.log("products.js not present — seeding accounts only (products are managed via the admin panel).");
    return [];
  }
  const src = readFileSync(file, "utf8");
  const window = {};
  new Function("window", src)(window);
  if (!Array.isArray(window.NASSIM_PRODUCTS)) throw new Error("NASSIM_PRODUCTS not found in products.js");
  return window.NASSIM_PRODUCTS;
}

/**
 * Convert a display name into a URL-safe slug matching ^[a-z0-9-]+$.
 * Examples: "Trolleys & Baskets" -> "trolleys-baskets",
 *           "Cooling Appliances"  -> "cooling-appliances".
 */
function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(slug) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/**
 * Categories that belong to the warehouse (INQUIRY purchase mode) department.
 * Matched against the raw catalog `category` display name (not the slugified
 * value) so the comparison is robust to naming drift.
 */
const INQUIRY_CATEGORY_NAMES = new Set([
  "Cooling Appliances",
  "Trolleys & Baskets",
  "Shelves & Stands",
  "Warehouse Equipment",
  "Checkout Solutions",
]);

async function main() {
  const products = loadCatalog();
  if (products.length === 0) {
    // Departments/categories/accounts below still seed; the per-product loop
    // naturally no-ops on an empty list.
    console.log("No catalog source — seeding structure and accounts only.");
  }

  const houseware = await prisma.department.upsert({
    where: { slug: "houseware" },
    update: {},
    create: { slug: "houseware", name: "Houseware", purchaseMode: "ONLINE" },
  });
  const warehouse = await prisma.department.upsert({
    where: { slug: "warehouse" },
    update: {},
    create: { slug: "warehouse", name: "Supermarket & Warehouse", purchaseMode: "INQUIRY" },
  });

  // Derive a slug for every distinct catalog category and route it to the
  // correct department based on the display name.
  const rawCategories = [...new Set(products.map((p) => p.category || "General"))];
  const categories = {};
  for (const rawName of rawCategories) {
    const slug = slugify(rawName);
    const dept = INQUIRY_CATEGORY_NAMES.has(rawName) ? warehouse : houseware;
    categories[rawName] = await prisma.category.upsert({
      where: { slug },
      update: { name: rawName, departmentId: dept.id },
      create: { slug, name: rawName, departmentId: dept.id },
    });
  }
  console.log(`Upserted ${rawCategories.length} categories`);

  // Idempotency: products are created on first run and never overwritten on
  // subsequent runs, so admin edits (price, images, flags, etc.) survive
  // re-seeding. A product is only created if its slug does not already exist.
  let created = 0;
  let skipped = 0;
  for (const p of products) {
    const slug = p.id;
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      skipped += 1;
      continue;
    }
    await prisma.product.create({
      data: {
        slug,
        name: p.name,
        description: p.description || "",
        price: String(p.price ?? 0),
        currency: p.currency || "KD",
        image: p.img || "",
        images: Array.isArray(p.images) ? p.images : [],
        line: p.line || "",
        sku: p.sku || "",
        specs: Array.isArray(p.specs) ? p.specs : [],
        categoryId: categories[p.category || "General"].id,
      },
    });
    created += 1;
  }
  console.log(`Products: ${created} created, ${skipped} skipped (already present)`);

  const adminEmail = process.env.ADMIN_SEED_EMAIL || "admin@alnassim.com";
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!adminPassword) throw new Error("ADMIN_SEED_PASSWORD missing in .env");
  // Admin user: created on first run; on subsequent runs only the role is
  // refreshed. The password is never overwritten, so rotated credentials
  // survive re-seeding.
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      name: "Administrator",
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: "ADMIN",
    },
  });
  console.log(`Admin user ready: ${adminEmail}`);

  const staffEmail = process.env.STAFF_SEED_EMAIL || "staff@alnassim.com";
  const staffPassword = process.env.STAFF_SEED_PASSWORD;
  if (staffPassword) {
    await prisma.user.upsert({
      where: { email: staffEmail },
      update: { role: "STAFF" },
      create: {
        email: staffEmail,
        name: "Staff",
        passwordHash: await bcrypt.hash(staffPassword, 12),
        role: "STAFF",
      },
    });
    console.log(`Staff user ready: ${staffEmail}`);
  }

  // NOTE: the SUPERADMIN (owner) seed was removed — the production role
  // model is ADMIN / STAFF / CUSTOMER only. Existing SUPERADMIN rows (if
  // any) are left untouched by the seed; no new ones are ever created.

  // Shipping rule (lib/shipping.ts): below the threshold a flat fee applies,
  // at or above it shipping is free. Upserts create-only so runtime changes
  // made via the Setting table are never overwritten by a re-seed.
  await prisma.setting.upsert({ where: { key: "shipping_threshold" }, update: {}, create: { key: "shipping_threshold", value: "20" } });
  await prisma.setting.upsert({ where: { key: "shipping_fee_below_threshold" }, update: {}, create: { key: "shipping_fee_below_threshold", value: "1" } });
  await prisma.setting.upsert({ where: { key: "shipping_fee_at_or_above" }, update: {}, create: { key: "shipping_fee_at_or_above", value: "0" } });
  // Legacy flat fee key — superseded by the threshold rule above.
  await prisma.setting.deleteMany({ where: { key: "shipping_fee" } });
  await prisma.setting.upsert({ where: { key: "currency" }, update: {}, create: { key: "currency", value: "KD" } });
  console.log("Settings ready");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
