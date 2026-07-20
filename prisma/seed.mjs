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

const INQUIRY_CATEGORIES = new Set(["racking", "shelving", "trolleys", "forklifts", "cold-room", "supermarket"]);

function titleCase(slug) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

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

  const categorySlugs = [...new Set(products.map((p) => p.category || "general"))];
  const categories = {};
  for (const slug of categorySlugs) {
    const dept = INQUIRY_CATEGORIES.has(slug) ? warehouse : houseware;
    categories[slug] = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { slug, name: titleCase(slug), departmentId: dept.id },
    });
  }
  console.log(`Upserted ${categorySlugs.length} categories`);

  for (const p of products) {
    const data = {
      name: p.name,
      description: p.description || "",
      price: String(p.price ?? 0),
      currency: p.currency || "KD",
      image: p.img || "",
      images: Array.isArray(p.images) ? p.images : [],
      line: p.line || "",
      sku: p.sku || "",
      specs: Array.isArray(p.specs) ? p.specs : [],
      categoryId: categories[p.category || "general"].id,
    };
    await prisma.product.upsert({ where: { slug: p.id }, update: data, create: { slug: p.id, ...data } });
  }
  console.log(`Upserted ${products.length} products`);

  const adminEmail = process.env.ADMIN_SEED_EMAIL || "admin@alnassim.com";
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!adminPassword) throw new Error("ADMIN_SEED_PASSWORD missing in .env");
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      name: "Administrator",
      passwordHash: await bcrypt.hash(adminPassword, 10),
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
