/**
 * restore-products-from-backup.cjs — RESTORE SCRIPT (do not run casually).
 *
 * Restores every product's ORIGINAL name and price from the pre-dummy
 * snapshot taken on 2026-09-14 before the "dummy / 0.000 KD" test
 * sanitization. Touches ONLY Product.name and Product.price — nothing else.
 *
 * Snapshot: db-backups/products_pre_dummy_20260914_154820.json
 * Full database backup: db-backups/nassim_backup_before_dummy_20260914_154820.dump
 *
 * Usage:
 *   node --env-file=.env scripts/restore-products-from-backup.cjs
 */
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const p = new PrismaClient();

const SNAPSHOT = "db-backups/products_pre_dummy_20260914_154820.json";

(async () => {
  const snap = JSON.parse(fs.readFileSync(SNAPSHOT, "utf8"));
  console.log(`Restoring ${snap.products.length} products from ${SNAPSHOT} (backed up at ${snap.backedUpAt})...`);
  let restored = 0;
  for (const prod of snap.products) {
    const res = await p.product.update({
      where: { id: prod.id },
      data: { name: prod.name, price: prod.price },
    });
    restored++;
  }
  console.log(`Restored name+price for ${restored} products. Database is back to its pre-dummy product state.`);
  await p.$disconnect();
})().catch(e => { console.error("RESTORE FAILED:", e.message); process.exit(1); });
