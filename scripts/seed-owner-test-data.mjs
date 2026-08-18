/**
 * seed-owner-test-data.mjs — clearly-marked TEST data for the SUPERADMIN /
 * Owner dashboard ONLY. Never touches existing rows except a small set of
 * REAL products whose stock values are temporarily adjusted for stock
 * analytics testing — the original values are snapshotted to
 * scripts/owner-test-data-manifest.json and restored by
 * `npm run cleanup:owner-test-data`.
 *
 * Everything created here is identifiable by:
 *   orderNumber  TEST-OA-###
 *   order notes  TEST_OWNER_ANALYTICS
 *   customer     TEST_OWNER_ANALYTICS_CUST_### / test.owner.analytics.###@test.local
 *
 * Revenue math uses the SAME billable rule as the dashboard
 * (exclude REMOVED_AFTER_CONFIRMATION items + cancelled orders) so the
 * verification numbers line up exactly with lib/analytics.ts.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const prisma = new PrismaClient();
const MANIFEST = join(dirname(fileURLToPath(import.meta.url)), "owner-test-data-manifest.json");
const MARKER = "TEST_OWNER_ANALYTICS";

const day = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function main() {
  if (existsSync(MANIFEST)) {
    throw new Error("Manifest already exists — run `npm run cleanup:owner-test-data` first (refusing to duplicate test data).");
  }

  /* ---------------- products (existing, real ids/prices) ---------------- */
  const slugs = [
    "shopping-basket-sy115",      // high UNITS
    "commercial-refrigerator-xg034", // high REVENUE
    "heavy-duty-forklift",        // highest revenue single line
    "shopping-trolley-sy143",     // mid units
    "mopping-trolley",            // mid
    "gourmet-cookware-set",       // kitchenware
    "pro-floor-squeegee-wiper",   // used as REMOVED_AFTER_CONFIRMATION item
    "display-shelf-yd1006",       // shelves & stands
    "artisan-ceramic-pitcher",    // low sales
    "minimalist-table-spoon",     // low sales
  ];
  const products = await prisma.product.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true, name: true, price: true, image: true, stock: true, minStock: true } });
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const missing = slugs.filter((s) => !bySlug.has(s));
  if (missing.length) throw new Error("Aborted — products not found: " + missing.join(", "));
  const P = (slug) => bySlug.get(slug);

  /* ---------------- stock analytics prep (snapshot + adjust) ---------------- */
  const stockPlan = [
    { slug: "shopping-trolley-sy143", stock: 0 },     // OUT OF STOCK
    { slug: "mopping-trolley", stock: 3 },             // LOW STOCK (min 10)
    { slug: "heavy-duty-forklift", stock: 5000 },      // HIGHEST STOCK
    { slug: "minimalist-table-spoon", stock: 5 },      // LOWEST IN-STOCK
  ];
  const stockSnapshot = [];
  for (const plan of stockPlan) {
    const p = P(plan.slug);
    stockSnapshot.push({ productId: p.id, slug: p.slug, stock: p.stock, minStock: p.minStock });
    await prisma.product.update({ where: { id: p.id }, data: { stock: plan.stock } });
  }

  /* ---------------- test customers ---------------- */
  const customers = [];
  for (const n of [1, 2, 3]) {
    const email = `test.owner.analytics.00${n}@test.local`;
    await prisma.user.deleteMany({ where: { email } }); // idempotent: clear leftovers only under the test email namespace
    customers.push(
      await prisma.user.create({
        data: {
          email,
          name: `${MARKER}_CUST_00${n}`,
          phone: "99900011" + n,
          passwordHash: await bcrypt.hash("TestOwnerAnalytics!00" + n, 12),
          role: "CUSTOMER",
        },
      })
    );
  }

  /* ---------------- orders ---------------- */
  // item helper: [slug, qty, status?]
  const O = (num, status, daysAgo, custIdx, items) => ({ num, status, createdAt: day(daysAgo), custIdx, items });
  const orderPlan = [
    // Today — drives "Today" KPI + same-day buckets
    O("001", "COMPLETED", 0, 0, [["shopping-basket-sy115", 10], ["shopping-trolley-sy143", 2]]),
    O("002", "PENDING", 0, 1, [["artisan-ceramic-pitcher", 1]]),
    // Yesterday
    O("003", "CONFIRMED", 1, 2, [["gourmet-cookware-set", 1]]),
    // This week
    O("004", "COMPLETED", 3, 0, [["heavy-duty-forklift", 1]]),                       // big revenue
    O("005", "CANCELLED_BY_CUSTOMER", 5, 1, [["shopping-trolley-sy143", 3]]),        // excluded from revenue
    O("006", "OUT_FOR_DELIVERY", 6, 2, [["display-shelf-yd1006", 2], ["shopping-basket-sy115", 6]]),
    // Earlier in the 30-day window
    O("007", "COMPLETED", 9, 0, [["shopping-basket-sy115", 12]]),                    // high units
    O("008", "CANCELLED_BY_STAFF", 12, 1, [["commercial-refrigerator-xg034", 1]]),   // excluded from revenue
    O("009", "DELIVERED", 15, 2, [["minimalist-table-spoon", 1], ["artisan-ceramic-pitcher", 1]]), // low sales
    O("010", "COMPLETED", 18, 0, [["shopping-trolley-sy143", 2], ["pro-floor-squeegee-wiper", 2, "REMOVED_AFTER_CONFIRMATION"]]),
    O("011", "COMPLETED", 22, 1, [["gourmet-cookware-set", 2]]),
    O("012", "COMPLETED", 28, 2, [["shopping-basket-sy115", 8]]),
    // Outside the 30-day window (drives This Year / Custom)
    O("013", "COMPLETED", 33, 0, [["commercial-refrigerator-xg034", 2]]),
    O("014", "PACKING", 40, 1, [["heavy-duty-forklift", 1]]),
  ];

  const SHIPPING = 2.5;
  const created = { orders: [], expected: [] };

  for (const o of orderPlan) {
    const cust = customers[o.custIdx];
    const itemsData = o.items.map(([slug, qty, itemStatus]) => {
      const p = P(slug);
      return { productId: p.id, slug: p.slug, name: `${MARKER}: ${p.name}`, image: p.image, price: p.price, quantity: qty, itemStatus: itemStatus ?? "AVAILABLE" };
    });
    // Stored totals mirror checkout convention: all items incl. later-removed ones.
    const subtotal = itemsData.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
    const billable = itemsData
      .filter((i) => i.itemStatus !== "REMOVED_AFTER_CONFIRMATION")
      .reduce((s, i) => s + Number(i.price) * i.quantity, 0);

    const order = await prisma.order.create({
      data: {
        orderNumber: `TEST-OA-${o.num}`,
        userId: cust.id,
        customerName: cust.name,
        customerEmail: cust.email,
        customerPhone: cust.phone,
        address: "Test Analytics Street 1",
        city: "Kuwait",
        notes: MARKER,
        status: o.status,
        subtotal,
        shipping: SHIPPING,
        total: subtotal + SHIPPING,
        currency: "KD",
        originalUserId: cust.id,
        originalUserEmail: cust.email,
        createdAt: o.createdAt,
        items: { create: itemsData },
        statusHistory: {
          create: { status: o.status, note: `${MARKER} seeded`, createdAt: o.createdAt },
        },
      },
    });
    created.orders.push({ id: order.id, orderNumber: order.orderNumber, status: o.status, createdAt: o.createdAt, billable });
    // per-day expected billable revenue (non-cancelled only) for verification
    if (o.status !== "CANCELLED_BY_CUSTOMER" && o.status !== "CANCELLED_BY_STAFF") {
      created.expected.push({ day: o.createdAt.toISOString().slice(0, 10), billable, items: itemsData.filter((i) => i.itemStatus !== "REMOVED_AFTER_CONFIRMATION").map((i) => ({ slug: i.slug, revenue: Number(i.price) * i.quantity, units: i.quantity })) });
    }
  }

  writeFileSync(MANIFEST, JSON.stringify({
    marker: MARKER,
    customers: customers.map((c) => ({ id: c.id, email: c.email })),
    orders: created.orders.map((o) => ({ id: o.id, orderNumber: o.orderNumber })),
    stockSnapshot,
  }, null, 2));

  const totalBillable = created.expected.reduce((s, e) => s + e.billable, 0);
  console.log(`Created ${customers.length} TEST customers, ${orderPlan.length} TEST orders (TEST-OA-001…${orderPlan.length.toString().padStart(3, "0")}).`);
  console.log(`Expected billable test revenue (all dates): ${totalBillable.toFixed(3)} KD (cancelled orders + removed items excluded).`);
  console.log(`Stock adjusted on ${stockSnapshot.length} real products — originals snapshotted to ${MANIFEST}`);
  console.log("Run `npm run cleanup:owner-test-data` to remove ALL of it and restore stock.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
