/**
 * create-subcategories-from-frontend.mjs — Create database subcategories from
 * the actual frontend filter options visible on each listing page, and map
 * existing products to the correct subcategory (2026-09-02).
 *
 * The storefront listing pages each display a set of filter/subcategory pills
 * (e.g., "Freezer", "Cooler & Chiller" on the Cooling Appliances page). These
 * were frontend-only UI elements with no database backing. This script creates
 * matching Subcategory records under the correct Category, then maps products
 * to subcategories based on their names/type.
 *
 * MAPPING (determined by browser-auditing every listing page's rendered DOM):
 *
 * Houseware:
 *   Kitchenware:     Cutlery & Cleaver, Cooking & Utensils, Drinkware
 *   Cleaning Tools:  Surface Cleaning, Toilet & Drain
 *   Home & Outdoor:  Laundry Essentials, Storage and Packaging, Picnic Collection
 *
 * Supermarket:
 *   Cooling Appliances:  Freezer, Cooler & Chiller
 *   Trolleys & Baskets:  Trolly, Basket
 *   Shelves & Stands:    Shelves, Stands
 *   Checkout Solutions:  (no filter options — no subcategories)
 *   Accessories:         (no filter options — no subcategories)
 *
 * Warehouse:
 *   Forklifts & Pallets: Forklift, Pallet
 *   Heavy Duty Racking:  (no filter options — no subcategories)
 *
 * "All" is never stored as a subcategory.
 * IDEMPOTENT: re-runs are safe (already-created subcategories and already-mapped
 * products are skipped).
 *
 * Run:  node scripts/create-subcategories-from-frontend.mjs
 * Rollback: delete all subcategories created by this script and null the
 * products' subcategoryId values (see the bottom of this file).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const SUBCATS = [
  { name: "Cutlery & Cleaver",     cat: "Kitchenware" },
  { name: "Cooking & Utensils",    cat: "Kitchenware" },
  { name: "Drinkware",             cat: "Kitchenware" },
  { name: "Surface Cleaning",      cat: "Cleaning Tools" },
  { name: "Toilet & Drain",        cat: "Cleaning Tools" },
  { name: "Laundry Essentials",    cat: "Home & Outdoor" },
  { name: "Storage and Packaging", cat: "Home & Outdoor" },
  { name: "Picnic Collection",     cat: "Home & Outdoor" },
  { name: "Freezer",               cat: "Cooling Appliances" },
  { name: "Cooler & Chiller",      cat: "Cooling Appliances" },
  { name: "Trolly",                cat: "Trolleys & Baskets" },
  { name: "Basket",                cat: "Trolleys & Baskets" },
  { name: "Shelves",               cat: "Shelves & Stands" },
  { name: "Stands",                cat: "Shelves & Stands" },
  { name: "Forklift",              cat: "Forklifts & Pallets" },
  { name: "Pallet",                cat: "Forklifts & Pallets" },
];

// Product name → subcategory name (null = leave unmapped)
const PRODUCT_MAP = {
  "Damascus Series Chef's Knife": "Cutlery & Cleaver",
  "Pizza Slicer": "Cutlery & Cleaver",
  "Pizza Server": "Cutlery & Cleaver",
  "Gourmet Cookware Set": "Cooking & Utensils",
  "Measuring Cups Set": "Cooking & Utensils",
  "Dough Roller": "Cooking & Utensils",
  "Dual-Blade Glass Wiper": "Surface Cleaning",
  "Pro Floor Squeegee Wiper": "Surface Cleaning",
  "Pro Dustpan & Broom Set": "Surface Cleaning",
  "Heavy-Duty Deck Scrub Brush": "Surface Cleaning",
  "Walk-in Freezer Unit": "Freezer",
  "Ice Cream Freezer": "Freezer",
  "Commercial Refrigerator XG034": "Cooler & Chiller",
  "Display Cooler XG035": "Cooler & Chiller",
  "Reach-in Refrigerator XG011": "Cooler & Chiller",
  "Beverage Cooler Station": "Cooler & Chiller",
  "Shopping Trolley SY143": "Trolly",
  "Checkout Trolley SY236": "Trolly",
  "Children Shopping Trolley": "Trolly",
  "Junior Shopping Trolley": "Trolly",
  "Double Basket Shopping Trolley": "Trolly",
  "Shopping Basket SY115": "Basket",
  "Compact Hand Basket": "Basket",
  "Heavy Duty Basket": "Basket",
  "Heavy Duty Wire Basket": "Basket",
  "Stackable Basket Container": "Basket",
  "Basket Trolley SY115": "Trolly",
  "Double Basket Trolley": "Trolly",
  "Wire Mesh Basket Trolley": "Trolly",
  "Foldable Hand Trolley": "Trolly",
  "Heavy Duty Platform Trolley": "Trolly",
  "Industrial Cage Trolley": "Trolly",
  "Light Duty Service Trolley": "Trolly",
  "Display Shelf YD1006": "Shelves",
  "Galvanized Steel Shelf": "Shelves",
  "Display Stand SY225": "Stands",
  "Wooden Display Stand": "Stands",
  "Basket Display Stand": "Stands",
  "Hook Display Rack": "Stands",
  "Heavy Duty Forklift": "Forklift",
  "Electric Forklift 2000kg": "Forklift",
  "Diesel Forklift 3000kg": "Forklift",
  "Compact Electric Forklift": "Forklift",
  "Reach Truck Forklift": "Forklift",
  "Order Picker": "Forklift",
  "Plastic Pallet Standard": "Pallet",
  "Wooden Pallet Heavy Duty": "Pallet",
  "Industrial Plastic Pallet": "Pallet",
  "Export Wooden Pallet": "Pallet",
};

async function main() {
  // 1. Create subcategories
  for (const sc of SUBCATS) {
    const slug = slugify(sc.name);
    const existing = await prisma.subcategory.findUnique({ where: { slug } });
    if (existing) { console.log(`= ${sc.name}: already exists`); continue; }
    const cat = await prisma.category.findFirst({ where: { name: sc.cat } });
    if (!cat) { console.warn(`? category "${sc.cat}" not found — skipped`); continue; }
    const created = await prisma.subcategory.create({ data: { name: sc.name, slug, categoryId: cat.id } });
    console.log(`+ ${sc.name} (id ${created.id}) under ${sc.cat}`);
  }

  // 2. Map products
  let mapped = 0;
  for (const [productName, subcatName] of Object.entries(PRODUCT_MAP)) {
    const product = await prisma.product.findFirst({ where: { name: productName }, select: { id: true, subcategoryId: true } });
    if (!product || product.subcategoryId) continue;
    const subcat = await prisma.subcategory.findFirst({ where: { name: subcatName }, select: { id: true } });
    if (!subcat) continue;
    await prisma.product.update({ where: { id: product.id }, data: { subcategoryId: subcat.id } });
    mapped++;
  }
  console.log(`\nmapped ${mapped} products to subcategories`);
  console.log(`total subcategories: ${await prisma.subcategory.count()}`);
  console.log(`products with subcategory: ${await prisma.product.count({ where: { subcategoryId: { not: null } } })}`);
}

/* ROLLBACK:
node -e "
const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();
const SLUGS=['cutlery-cleaver','cooking-utensils','drinkware','surface-cleaning','toilet-drain','laundry-essentials','storage-and-packaging','picnic-collection','freezer','cooler-chiller','trolly','basket','shelves','stands','forklift','pallet'];
(async()=>{
  await p.product.updateMany({where:{subcategory:{slug:{in:SLUGS}}},data:{subcategoryId:null}});
  await p.subcategory.deleteMany({where:{slug:{in:SLUGS}}});
  console.log('rolled back');
  await p.\$disconnect();
})()"
*/
main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
