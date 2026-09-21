/**
 * Read-only dependency analysis for test-artifact cleanup.
 * Maps every candidate user/order/product to its dependencies so removal
 * can be planned safely. No mutations.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Candidate TEST users by id (see classification report).
const TEST_USER_IDS = [
  2, 3,            // early dev: test1@example.com, patch@example.com
  24, 25, 29, 31,  // verify-* fixtures
  32, 33, 34,      // TEST_OWNER_ANALYTICS customers
  37, 38, 39, 40, 41, 42, // sec-test-*
  43, 44, 45,      // audit2-*
  46, 47,          // pp-*, audinj-*
  48,              // e2e-test-20260818
  49, 50,          // sec-boundary-*
  56,              // batch2-verify-admin
  81, 82, 83, 84, 87, 88, 89, 90, 91, 92, // authz matrix
  85, 86,          // browser-staff / browser-customer
  95, 96,          // zztest-*
  97,              // qa-temp-admin
];

// Candidate TEST products by id.
const TEST_PRODUCT_IDS = [79, 80, 151];

async function main() {
  console.log("=== USER DEPENDENCIES ===");
  for (const uid of TEST_USER_IDS) {
    const u = await prisma.user.findUnique({
      where: { id: uid },
      select: { email: true, role: true, isActive: true },
    });
    if (!u) { console.log(`user ${uid}: MISSING`); continue; }
    const [orders, sessions, addresses, carts, wishes, notifs, pwTokens] = await Promise.all([
      prisma.order.findMany({ where: { userId: uid }, select: { id: true, orderNumber: true, status: true } }),
      prisma.session.count({ where: { userId: uid } }),
      prisma.address.count({ where: { userId: uid } }),
      prisma.cartItem.count({ where: { userId: uid } }),
      prisma.wishlistItem.count({ where: { userId: uid } }),
      prisma.notification.count({ where: { userId: uid } }),
      prisma.passwordResetToken.count({ where: { userId: uid } }),
    ]);
    console.log(
      `user ${uid} (${u.email}, ${u.role}, active=${u.isActive}): orders=[${orders.map((o) => `${o.id}:${o.orderNumber}:${o.status}`).join(", ") || "none"}] sessions=${sessions} addrs=${addresses} cart=${carts} wish=${wishes} notifs=${notifs} pwTokens=${pwTokens}`
    );
  }

  console.log("\n=== TEST PRODUCT DEPENDENCIES ===");
  for (const pid of TEST_PRODUCT_IDS) {
    const p = await prisma.product.findUnique({ where: { id: pid }, select: { slug: true, isActive: true } });
    if (!p) { console.log(`product ${pid}: MISSING`); continue; }
    const [orderItems, carts, wishes, movements, custom, related, media] = await Promise.all([
      prisma.orderItem.findMany({ where: { productId: pid }, select: { id: true, orderId: true, name: true, quantity: true } }),
      prisma.cartItem.count({ where: { productId: pid } }),
      prisma.wishlistItem.count({ where: { productId: pid } }),
      prisma.stockMovement.count({ where: { productId: pid } }),
      prisma.productCustomValue.count({ where: { productId: pid } }),
      prisma.relatedProduct.count({ where: { OR: [{ productId: pid }, { relatedId: pid }] } }),
      prisma.productImage.count({ where: { productId: pid } }),
    ]);
    console.log(
      `product ${pid} (${p.slug}, active=${p.isActive}): orderItems=[${orderItems.map((i) => `${i.id}(order ${i.orderId})`).join(", ") || "none"}] cart=${carts} wish=${wishes} movements=${movements} custom=${custom} related=${related} media=${media}`
    );
  }

  console.log("\n=== ORDERS: OUTSTANDING STOCK RESERVATIONS (all orders) ===");
  // Reproduce lib/online-stock.ts outstandingReservation over ALL movements.
  const movements = await prisma.stockMovement.findMany({
    select: { note: true, productId: true, delta: true, reason: true },
  });
  const outstanding = new Map();
  for (const m of movements) {
    const orderNumber = m.note;
    if (!orderNumber) continue;
    let per = outstanding.get(orderNumber) ?? new Map();
    if (m.reason === "ONLINE_ORDER_RESERVATION") {
      per.set(m.productId, (per.get(m.productId) ?? 0) + Math.abs(m.delta));
    } else if (m.reason.endsWith("_RESTORE")) {
      per.set(m.productId, (per.get(m.productId) ?? 0) - m.delta);
    }
    outstanding.set(orderNumber, per);
  }
  const rows = [...outstanding.entries()]
    .map(([orderNumber, per]) => ({
      orderNumber,
      open: [...per.entries()].filter(([, n]) => n > 0),
    }))
    .filter((r) => r.open.length > 0);
  for (const r of rows) {
    console.log(`${r.orderNumber}: outstanding=${r.open.map(([pid, n]) => `product ${pid} x${n}`).join(", ")}`);
  }
  if (rows.length === 0) console.log("(none)");

  console.log("\n=== ORDERS BY TEST CUSTOMER EMAIL (guest test orders) ===");
  const testEmails = [
    "guest@example.com", "smoke@example.com", "flow-cb5fbd50@test.local", "flow-1173f185@test.local",
    "audit@test.local", "regression@test.local", "cartclear@test.local", "prod.smoke.test@test.local",
    "rc@test.local", "rcguest@test.local", "zztest-qa@example.com", "zztest-tamper@example.com",
  ];
  for (const email of testEmails) {
    const orders = await prisma.order.findMany({ where: { customerEmail: email }, select: { id: true, orderNumber: true, status: true } });
    if (orders.length) console.log(`${email}: ${orders.map((o) => `${o.id}:${o.orderNumber}`).join(", ")}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
