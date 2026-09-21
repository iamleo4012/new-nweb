/**
 * TEST-ARTIFACT CLEANUP (one-shot, explicit ID lists — no pattern matching).
 *
 * Scope (see classification report):
 *   - Removes clearly identifiable testing artifacts ONLY:
 *     temporary QA accounts, their QA orders, guest test orders
 *     (ZZTEST / TEST-OA-* / verify-* / sec-* / audit / authz / e2e /
 *     rate-limit / probe / regression fixtures), and 3 incomplete test
 *     products (no image, inactive, test names).
 *   - KEEPS: real ADMIN/STAFF accounts, the real customer account
 *     (leojoseph861@gmail.com) + its orders, the legacy owner@alnassim.com
 *     row, guest order AN-2026-000213 ("sam" — possibly a real customer),
 *     and ALL dummy catalog products that have proper images/information.
 *
 * Safety measures:
 *   - Every order with an OUTSTANDING online-stock reservation gets its
 *     units restored FIRST (same ledger math as lib/online-stock.ts), so
 *     deleting test orders never permanently consumes dummy-product stock.
 *   - One transaction; AuditLog entry documents the cleanup.
 *   - stockStatus backfill for all products (the column was never
 *     maintained): 0 → OUT_OF_STOCK, <= minStock → LOW_STOCK, else
 *     IN_STOCK; manual PREORDER/DISCONTINUED (if any) preserved.
 *
 * Run: node scripts/cleanup-test-artifacts.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---- Classification (deterministic, from scripts/analyze-test-artifacts.mjs) ----

// Temporary QA / verification / security-test / fixture accounts.
const TEST_USER_IDS = [
  2, 3,
  24, 25, 29, 31,
  32, 33, 34,
  37, 38, 39, 40, 41, 42,
  43, 44, 45,
  46, 47,
  48,
  49, 50,
  56,
  81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92,
  95, 96,
  97,
];

// Test orders (by id): QA/fixture/guest-test orders. KEEPS orders 8, 11, 12,
// 13, 14, 198 (real customer leojoseph861@gmail.com) and 213 ("sam").
const TEST_ORDER_IDS = [
  1, 2, 3, 4, 30, 31,
  33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, // TEST-OA-001..014
  47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 89,
  90, 92, 93, 94, 96, 97,
  100, 101, 102, 103, 104, 105,
  199, 200, 201, 202, 203, 204, 205, 206, 207,
  211,
  214, 215, 217, 218, 219, 223,
];

// Incomplete test products (no image, inactive, test-only names).
const TEST_PRODUCT_IDS = [79, 80, 151];

// ---- Helpers ------------------------------------------------------------

/** Outstanding (reserved-but-not-restored) units per orderNumber → productId. */
async function outstandingReservations() {
  const movements = await prisma.stockMovement.findMany({
    select: { note: true, productId: true, delta: true, reason: true },
  });
  const outstanding = new Map();
  for (const m of movements) {
    const orderNumber = m.note;
    if (!orderNumber) continue;
    const per = outstanding.get(orderNumber) ?? new Map();
    if (m.reason === "ONLINE_ORDER_RESERVATION") {
      per.set(m.productId, (per.get(m.productId) ?? 0) + Math.abs(m.delta));
    } else if (m.reason.endsWith("_RESTORE")) {
      per.set(m.productId, (per.get(m.productId) ?? 0) - m.delta);
    }
    outstanding.set(orderNumber, per);
  }
  for (const [k, per] of outstanding) {
    for (const [pid, n] of per) if (n <= 0) per.delete(pid);
    if (per.size === 0) outstanding.delete(k);
  }
  return outstanding;
}

async function main() {
  console.log("=== TEST ARTIFACT CLEANUP ===");

  const orders = await prisma.order.findMany({
    where: { id: { in: TEST_ORDER_IDS } },
    select: { id: true, orderNumber: true },
  });
  const orderNumbers = orders.map((o) => o.orderNumber);
  const byId = new Map(orders.map((o) => [o.id, o.orderNumber]));
  const missing = TEST_ORDER_IDS.filter((id) => !byId.has(id));
  if (missing.length) console.log(`(note: order ids already absent: ${missing.join(", ")})`);

  const users = await prisma.user.findMany({
    where: { id: { in: TEST_USER_IDS } },
    select: { id: true, email: true },
  });
  const missingUsers = TEST_USER_IDS.filter((id) => !users.some((u) => u.id === id));
  if (missingUsers.length) console.log(`(note: user ids already absent: ${missingUsers.join(", ")})`);

  // Pre-state snapshot for the report.
  const beforeCounts = {
    users: await prisma.user.count(),
    orders: await prisma.order.count(),
    products: await prisma.product.count(),
    notifications: await prisma.notification.count(),
    stockMovements: await prisma.stockMovement.count(),
    orderSecurity: await prisma.orderSecurity.count(),
  };

  // Outstanding reservations of the orders being deleted — must restore.
  const outstanding = await outstandingReservations();
  const toRestore = new Map();
  for (const orderNumber of orderNumbers) {
    const per = outstanding.get(orderNumber);
    if (!per) continue;
    for (const [pid, qty] of per) {
      toRestore.set(pid, (toRestore.get(pid) ?? 0) + qty);
    }
  }
  console.log("Stock to restore (product -> units):", JSON.stringify([...toRestore.entries()]));

  await prisma.$transaction(async (tx) => {
    // 1) Restore outstanding reservations so deleted test orders do not
    //    permanently consume dummy-product online stock.
    const restoreDetails = [];
    for (const [productId, qty] of toRestore) {
      const p = await tx.product.findUnique({ where: { id: productId }, select: { stock: true, slug: true } });
      if (!p) continue;
      await tx.product.update({ where: { id: productId }, data: { stock: { increment: qty } } });
      restoreDetails.push(`${p.slug}: ${p.stock} -> ${p.stock + qty}`);
    }

    // 2) Remove the reservation ledger rows of the deleted test orders
    //    (they are part of the artifact; the AuditLog entry below keeps the
    //    human-readable record of this cleanup).
    await tx.stockMovement.deleteMany({ where: { note: { in: orderNumbers } } });

    // 3) Security metadata rows (no FK — keyed by orderNumber).
    await tx.orderSecurity.deleteMany({ where: { orderNumber: { in: orderNumbers } } });

    // 4) Notifications owned by deleted test users (userId has no FK —
    //    order-cascades cover the rest).
    await tx.notification.deleteMany({ where: { userId: { in: TEST_USER_IDS } } });

    // 5) Orders (cascades: items, status history, order-linked notifications).
    await tx.order.deleteMany({ where: { id: { in: TEST_ORDER_IDS } } });

    // 6) Test users (cascades: sessions, addresses, cart, wishlist, pw tokens).
    await tx.user.deleteMany({ where: { id: { in: TEST_USER_IDS } } });

    // 7) Incomplete test products (cascades: related rows, media, values).
    await tx.product.deleteMany({ where: { id: { in: TEST_PRODUCT_IDS } } });

    // 8) stockStatus backfill — the column existed but was never maintained.
    //    Derived exactly like lib/low-stock.ts; manual statuses preserved.
    const all = await tx.product.findMany({
      select: { id: true, stock: true, minStock: true, stockStatus: true },
    });
    let fixed = 0;
    for (const p of all) {
      let next;
      if (p.stockStatus === "PREORDER" || p.stockStatus === "DISCONTINUED") continue;
      if (p.stock <= 0) next = "OUT_OF_STOCK";
      else if (p.stock <= p.minStock) next = "LOW_STOCK";
      else next = "IN_STOCK";
      if (next !== p.stockStatus) {
        await tx.product.update({ where: { id: p.id }, data: { stockStatus: next } });
        fixed++;
      }
    }

    // 9) One audit entry documenting the cleanup.
    await tx.auditLog.create({
      data: {
        action: "TEST_ARTIFACT_CLEANUP",
        entity: "Maintenance",
        entityId: "",
        detail: `removed ${TEST_USER_IDS.length} test users, ${orderNumbers.length} test orders (${orderNumbers.join(", ")}), ${TEST_PRODUCT_IDS.length} incomplete test products; restored stock: ${restoreDetails.join("; ") || "none"}; stockStatus backfill on ${fixed} products`,
      },
    });

    console.log("Restored:", restoreDetails.join(" | ") || "nothing to restore");
    console.log(`stockStatus backfilled on ${fixed} products`);
  });

  const afterCounts = {
    users: await prisma.user.count(),
    orders: await prisma.order.count(),
    products: await prisma.product.count(),
    notifications: await prisma.notification.count(),
    stockMovements: await prisma.stockMovement.count(),
    orderSecurity: await prisma.orderSecurity.count(),
  };
  console.log("BEFORE:", JSON.stringify(beforeCounts));
  console.log("AFTER: ", JSON.stringify(afterCounts));

  // ---- Integrity verification ----
  const problems = [];
  // Orders pointing at non-existent users.
  const danglingUserOrders = await prisma.order.findMany({
    where: { userId: { not: null } },
    select: { id: true, userId: true },
  });
  const userIds = new Set((await prisma.user.findMany({ select: { id: true } })).map((u) => u.id));
  for (const o of danglingUserOrders) {
    if (o.userId != null && !userIds.has(o.userId)) problems.push(`order ${o.id} references missing user ${o.userId}`);
  }
  // OrderItems pointing at missing products (productId is nullable → allowed, reported only).
  const items = await prisma.orderItem.findMany({ where: { productId: { not: null } }, select: { id: true, productId: true } });
  const productIds = new Set((await prisma.product.findMany({ select: { id: true } })).map((p) => p.id));
  for (const i of items) {
    if (i.productId != null && !productIds.has(i.productId)) problems.push(`orderItem ${i.id} references missing product ${i.productId}`);
  }
  // OrderSecurity rows without their order.
  const sec = await prisma.orderSecurity.findMany({ select: { orderNumber: true } });
  const orderNums = new Set((await prisma.order.findMany({ select: { orderNumber: true } })).map((o) => o.orderNumber));
  for (const s of sec) if (!orderNums.has(s.orderNumber)) problems.push(`orderSecurity ${s.orderNumber} references missing order`);
  // Stock movements referencing missing orders (by note) or products.
  const movements = await prisma.stockMovement.findMany({ select: { id: true, note: true, productId: true } });
  for (const m of movements) {
    if (m.note && !orderNums.has(m.note)) problems.push(`stockMovement ${m.id} references missing order ${m.note}`);
    if (!productIds.has(m.productId)) problems.push(`stockMovement ${m.id} references missing product ${m.productId}`);
  }
  // Notifications referencing missing orders/users.
  const notifs = await prisma.notification.findMany({ select: { id: true, orderId: true, userId: true } });
  const orderIds = new Set((await prisma.order.findMany({ select: { id: true } })).map((o) => o.id));
  for (const n of notifs) {
    if (n.orderId != null && !orderIds.has(n.orderId)) problems.push(`notification ${n.id} references missing order ${n.orderId}`);
    if (n.userId != null && !userIds.has(n.userId)) problems.push(`notification ${n.id} references missing user ${n.userId}`);
  }

  if (problems.length) {
    console.log("INTEGRITY PROBLEMS:");
    for (const p of problems) console.log(" -", p);
    process.exitCode = 2;
  } else {
    console.log("INTEGRITY: OK — no orphan records, no broken relationships.");
  }

  // Final state summary.
  const remainingUsers = await prisma.user.findMany({ orderBy: { id: "asc" }, select: { id: true, email: true, role: true, isActive: true } });
  console.log("\nREMAINING USERS:");
  for (const u of remainingUsers) console.log(JSON.stringify(u));
  const remainingOrders = await prisma.order.findMany({ orderBy: { id: "asc" }, select: { id: true, orderNumber: true, customerName: true, status: true } });
  console.log("\nREMAINING ORDERS:");
  for (const o of remainingOrders) console.log(JSON.stringify(o));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
