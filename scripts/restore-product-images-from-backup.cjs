/**
 * restore-product-images-from-backup.cjs — RESTORE SCRIPT (do not run casually).
 *
 * Restores every product's ORIGINAL image reference (image + images[]) from
 * the image-inclusive snapshot taken on 2026-09-14 before the dummy-image
 * test sanitization. Touches ONLY Product.image and Product.images —
 * nothing else. Original image files were never modified; the dummy file
 * (public/topcar/dummy.png) can be deleted separately if desired.
 *
 * Snapshot: db-backups/products_with_images_20260914_160500.json
 * Image file backup: db-backups/original_image_files_20260914_160500/
 *
 * Usage:
 *   node --env-file=.env scripts/restore-product-images-from-backup.cjs
 */
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const p = new PrismaClient();

const SNAPSHOT = "db-backups/products_with_images_20260914_160500.json";

(async () => {
  const snap = JSON.parse(fs.readFileSync(SNAPSHOT, "utf8"));
  console.log(`Restoring image references for ${snap.products.length} products from ${SNAPSHOT} (backed up at ${snap.backedUpAt})...`);
  let restored = 0;
  for (const prod of snap.products) {
    await p.product.update({
      where: { id: prod.id },
      data: { image: prod.image, images: prod.images },
    });
    restored++;
  }
  console.log(`Restored image references for ${restored} products. Product images are back to their pre-dummy state.`);
  await p.$disconnect();
})().catch(e => { console.error("RESTORE FAILED:", e.message); process.exit(1); });
