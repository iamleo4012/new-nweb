import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const prisma = new PrismaClient();
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function loadCatalog() {
  const src = readFileSync(path.join(root, "public", "assets", "js", "products.js"), "utf8");
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
  console.log(`Loaded ${products.length} products from products.js`);

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

  await prisma.setting.upsert({ where: { key: "shipping_fee" }, update: {}, create: { key: "shipping_fee", value: "2.5" } });
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
