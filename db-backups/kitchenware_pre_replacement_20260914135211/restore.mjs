// Targeted restore of the pre-replacement Kitchenware catalog.
// Run from the project root:  node db-backups/kitchenware_pre_replacement_20260914135211/restore.mjs
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
const db = new PrismaClient();
const dir = import.meta.dirname;

const oldProducts = JSON.parse(fs.readFileSync(path.join(dir, 'kitchenware_products_full.json'), 'utf8'));
const refs = JSON.parse(fs.readFileSync(path.join(dir, 'referencing_rows.json'), 'utf8'));
const newSlugs = JSON.parse(fs.readFileSync(path.join(dir, 'new_product_slugs.json'), 'utf8'));

// 1. Remove the 10 replacement products (safe: created by the import; if any
//    got order items meanwhile, their productId is set NULL by the FK).
const del = await db.product.deleteMany({ where: { slug: { in: newSlugs } } });
console.log('deleted replacement products:', del.count);

// 2. Recreate the 9 old products with original ids + every field.
for (const p of oldProducts) {
  const { category, subcategory, colors, sizes, mediaImages, customValues, relatedFrom, relatedTo, stockMovements, orderItems, wishlist, cartItems, ...row } = p;
  await db.product.create({ data: row });
  console.log('restored product id', row.id, row.slug);
}

// 3. Restore reference rows (insert with original ids).
for (const c of refs.cartItems) {
  await db.cartItem.upsert({ where: { id: c.id }, create: c, update: c }).catch(e => console.log('cartItem', c.id, e.message));
}
for (const r of refs.relatedProducts) {
  await db.relatedProduct.upsert({ where: { productId_relatedId: { productId: r.productId, relatedId: r.relatedId } }, create: r, update: {} }).catch(e => console.log('related', r.id, e.message));
}
// OrderItem.productId links (rows themselves were never deleted, only unlinked):
for (const o of refs.orderItems) {
  await db.orderItem.update({ where: { id: o.id }, data: { productId: o.productId } }).catch(e => console.log('orderItem', o.id, e.message));
}

const count = await db.product.count({ where: { categoryId: 5 } });
console.log('kitchenware products now:', count);
await db.$disconnect();
