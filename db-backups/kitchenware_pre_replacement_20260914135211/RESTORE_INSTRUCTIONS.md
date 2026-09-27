# Kitchenware Pre-Replacement Backup — 2026-09-14

Created before replacing the 9 old Kitchenware products (ids 15,16,64,66,81,82,83,84,152)
with the 10 new products from "kitchenware data final.xlsx".

## Contents
- kitchenware_products_full.json   — every Product field of the 9 old products
- referencing_rows.json            — OrderItem (5), CartItem (3), RelatedProduct (12) rows tied to them
- image_files/                     — local image files the old products used (topcar/...)
- remote_images.json               — externally-hosted image URLs (recorded, not copyable)
- non_kitchenware_snapshot.json    — proof snapshot of the 67 untouched products
- pre_replacement_counts.json      — products=76, orders=15, orderItems=22, users=5
- nassim_full_pre_kitchenware_replacement.dump — FULL pg_dump (custom format) of the whole DB
- restore.mjs                      — targeted restore script (products + links only)

## How to revert

Option A — full database restore (nuclear, restores EVERYTHING to this moment):
  PGPASSWORD=<password> "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" \
    -h localhost -U nassim_app -d nassim --clean --if-exists \
    "nassim_full_pre_kitchenware_replacement.dump"

Option B — targeted Kitchenware restore (run from the project root, keeps everything else):
  node db-backups/kitchenware_pre_replacement_20260914135211/restore.mjs
  (deletes the 10 new products by their slugs nd-*, recreates the 9 old products
   with their original ids and every field, and re-links OrderItem.productId /
   CartItem / RelatedProduct rows exactly as they were)
