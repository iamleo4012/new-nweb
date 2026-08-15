# Database Overview

> Project: **nassim-platform**
> Audit date: 2026-07-21
> Source: `prisma/schema.prisma` (391 lines, 20 models, 4 enums)

This document catalogs the PostgreSQL schema, its relationships, the migration
history, the seed process, and notable integrity / design observations.

---

## 1. Connection & provider

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
generator client { provider = "prisma-client-js" }
```

- One database, default `public` schema.
- `DATABASE_URL` from `.env`:
  `postgresql://postgres:apple123@localhost:5432/postgres`
  (local dev only; password is weak and plaintext).

---

## 2. Enums (4)

| Enum | Values | Used by |
|---|---|---|
| `PurchaseMode` | `ONLINE`, `INQUIRY` | `Department.purchaseMode` |
| `UserRole` | `CUSTOMER`, `STAFF`, `ADMIN` | `User.role` |
| `OrderStatus` | `PENDING`, `CONFIRMED`, `PACKING`, `OUT_FOR_DELIVERY`, `DELIVERED`, `COMPLETED`, `CANCELLED`, `REJECTED`, `REFUNDED` | `Order.status`, `OrderStatusEvent.status` |
| `StockStatus` | `IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`, `PREORDER`, `DISCONTINUED` | `Product.stockStatus` |

> `REFUNDED` was added in the phase-2 migration via
> `ALTER TYPE "OrderStatus" ADD VALUE 'REFUNDED'` (non-transactional in PG).
> The admin UI status buttons (`AdminApp.tsx`) do **not** include `REFUNDED`;
> `CustomersTab.tsx` has a colour for it. Inconsistent surface.

---

## 3. Entity map (20 models)

### 3.1 Catalog hierarchy

```
Department (slug, name, purchaseMode)
   │ 1:N
   ├── Section (slug, name) ──┐
   │      │ 1:N               │
   │      ▼                   │
   └── Category (slug, name) ◄┘ sectionId optional
          │ 1:N
          ├── Subcategory (slug, name)
          │        │ 1:N
          │        ▼
          └── Product  ◄──── also Product directly under Category
```

- `Department` → `Category` is direct (1:N) **and** via `Section`
  (`Department → Section → Category`). Both paths coexist; `Category.sectionId`
  is optional. This is a slightly redundant hierarchy.

### 3.2 Master data (Phase 2)

All are simple lookup tables with `id`, unique `slug`, `name` (+ optional
display fields). Each has a 1:N relation to `Product` (or to a join table):

| Model | Relation to Product |
|---|---|
| `Brand` | `Product.brandId` (nullable) |
| `Material` | `Product.materialId` (nullable) |
| `Supplier` | `Product.supplierId` (nullable) — has `contact`, `phone`, `email` |
| `Unit` | `Product.unitId` (nullable) |
| `Country` | `Product.countryId` (nullable) |
| `Tax` | `Product.taxId` (nullable) — `rate Decimal(6,3)` |
| `Color` | M:N via `ProductColor` (also has `hex`) |
| `Size` | M:N via `ProductSize` |

### 3.3 Product

The `Product` model is the centre of the schema — **38 columns** spanning
identity, commerce, inventory, SEO, dimensions, and relations.

**Identity & content**
`id`, `slug` (unique), `name`, `description`, `longDescription`, `line`,
`sku`, `barcode`, `ndNumber`, `internalCode`, `applications`, `additionalInfo`,
`warranty`, `tags[]`, `specs Json`.

**Commerce**
`price Decimal(10,3)`, `discount Decimal(10,3)`, `costPrice Decimal(10,3)`,
`currency` (default `"KD"`), `image`, `images String[]`.

**SEO**
`seoTitle`, `seoDescription`.

**Inventory**
`stock Int`, `minStock Int`, `stockStatus StockStatus`, `isActive`,
`isFeatured`, `isNewArrival`, `isBestSeller`.

**Dimensions**
`weight`, `length`, `width`, `height` — all `Decimal(10,3)` nullable.

**Relations**
`categoryId` (required), `subcategoryId` (optional), `brandId`, `materialId`,
`supplierId`, `unitId`, `countryId`, `taxId` (all optional),
`colors[]`, `sizes[]`, `mediaImages[]`, `stockMovements[]`, `orderItems[]`,
`wishlist[]`, `cartItems[]`.

**Timestamps** `createdAt`, `updatedAt`.

**Indexes** `categoryId`, `isActive`, `brandId`, `supplierId`, `barcode`,
plus unique `slug`.

### 3.4 Media

`ProductImage(id, productId, url, sortOrder, isPrimary)` — multiple images
per product with ordering and a primary flag. Cascade-deletes with product.

> Note the schema has **both** `Product.image String` and `Product.images String[]`
> **and** the `ProductImage` table — three overlapping ways to store images.
> The admin writes to `images[]` and `ProductImage`; the storefront reads
> `image` (single). Drift risk.

### 3.5 Inventory audit

`StockMovement(id, productId, delta, reason, note, actorId?, createdAt)` — an
append-only ledger of stock changes. Indexes on `productId` and `createdAt`.

> ⚠️ **`StockMovement` is never written anywhere in the codebase.** The
> `orders` route decrements `Product.stock` directly without recording a
> movement, and the admin does not create movements either. The table is
> defined, indexed, and indexed — but unused. (See `Project_Audit.md`.)

### 3.6 Users, sessions, addresses

```
User
 ├── sessions[]      Session(id UUID, userId, expiresAt, createdAt)
 ├── addresses[]     Address(label, fullName, phone, address, city, area, isDefault)
 ├── orders[]        (optional — guest orders have userId = null)
 ├── cartItems[]     CartItem(userId, productId, quantity)  unique(userId, productId)
 └── wishlist[]      WishlistItem(userId, productId)        unique(userId, productId)
```

- `User.passwordHash` (bcrypt, cost 10).
- `User.role` default `CUSTOMER`; `isActive` flag for soft-disable.
- `Session.id` is a server-generated UUID; cookie carries a JWT wrapping it.
- `Address` has `isDefault` but **no enforcement** of single-default at the
  DB or app layer.

### 3.7 Orders

```
Order
 ├── user? (nullable — guests allowed)
 ├── customerName, customerEmail, customerPhone, address, city, notes
 ├── status OrderStatus (default PENDING)
 ├── subtotal, shipping (default 2.5), total  — all Decimal(10,3)
 ├── currency (default "KD")
 ├── items[]           OrderItem(orderId, productId?, slug, name, image, price, quantity)
 └── statusHistory[]   OrderStatusEvent(orderId, status, note, createdAt)
```

- `orderNumber` unique, format `AN-<year>-<padded id>` (set in a second
  UPDATE after create).
- `OrderItem.productId` nullable (SET NULL on product delete) — order history
  survives product removal. Snapshot fields `slug/name/image/price` are
  captured at order time.
- Indexes on `userId`, `status`, `customerEmail`.

### 3.8 Settings & audit

- `Setting(key PK, value)` — currently holds `shipping_fee="2.5"`,
  `currency="KD"`.
- `AuditLog(id, actorId?, action, entity, entityId, detail, createdAt)` —
  written by every admin mutation. Indexed on `entity`. `actorId` is
  intentionally not an FK so audit rows survive user deletion.

---

## 4. Migration history

| Migration | Lines | Content |
|---|---|---|
| `migration_lock.toml` | 3 | locks provider to `postgresql` |
| `20260720164813_init` | 248 | Phase 1 — core e-commerce (13 tables, 3 enums) |
| `20260720194752_phase2_erp_master_data` | 302 | Phase 2 — ERP master data (15 new tables, 1 new enum, 27 new Product columns, `OrderStatus.REFUNDED`) |

### Phase 1 (`…_init`)

Tables: `Department`, `Category`, `Product`, `User`, `Session`, `CartItem`,
`WishlistItem`, `Order`, `OrderItem`, `OrderStatusEvent`, `Setting`, `AuditLog`.
Enums: `PurchaseMode`, `UserRole`, `OrderStatus` (without `REFUNDED`).
FKs all carry explicit `ON DELETE`. No destructive ops — pure `CREATE`.

### Phase 2 (`…_phase2_erp_master_data`)

- New enum `StockStatus`.
- `ALTER TYPE "OrderStatus" ADD VALUE 'REFUNDED'`
  (⚠️ non-transactional; Prisma handles by stripping the surrounding txn).
- 15 new tables (Section, Subcategory, Brand, Material, Color, Size,
  Supplier, Unit, Country, Tax, ProductColor, ProductSize, ProductImage,
  StockMovement, Address).
- `Category.sectionId` added (nullable).
- 27 new `Product` columns — all nullable or with defaults, so backfill-safe.
- New indexes on every lookup-table `slug` plus `Product` FK indexes.

### Schema ↔ migration sync

The two migrations are **fully in sync** with `schema.prisma`. There are no
columns/tables/enums in the schema that lack a migration, and no migration
statements that drift from the schema. A `prisma migrate status` against this
folder should report no drift (assuming no manual DB changes).

---

## 5. Seed process (`prisma/seed.mjs`)

- `loadCatalog()` reads `public/assets/js/products.js`, executes it via
  `new Function("window", src)(window)` to harvest `window.NASSIM_PRODUCTS`
  (**67 products**, **11 categories**).
- **Departments** (2): `houseware` (ONLINE), `warehouse` (INQUIRY).
- **Categories**: one per unique `p.category` value (display name).
- **Products**: `upsert` by `slug = p.id`. **Full overwrite** on each run
  (any admin edits to catalog fields are clobbered).
- **Admin user**: email from `ADMIN_SEED_EMAIL` (default
  `admin@alnassim.com`), password from `ADMIN_SEED_PASSWORD` (**required**),
  role `ADMIN`. Re-running forces role back to ADMIN but **does not rotate
  the password**.
- **Settings**: `shipping_fee="2.5"`, `currency="KD"`.

### ⚠️ Seed bug: department routing

`seed.mjs:18` defines:
```js
const INQUIRY_CATEGORIES = new Set(["racking","shelving","trolleys","forklifts","cold-room","supermarket"]);
```
…intended to route those categories to the `warehouse` (INQUIRY) department.

But `seed.mjs:39` derives category slugs from `p.category`, which contains
**display names** like `"Trolleys & Baskets"`, `"Cooling Appliances"`,
`"Warehouse Equipment"` — never slug tokens like `"trolleys"`.

**Consequence:** `INQUIRY_CATEGORIES.has(slug)` always returns `false`, so
**every category is assigned to `houseware` (ONLINE)**. The `warehouse`
department is created but receives **zero** categories.

Secondary effect: `Category.slug` ends up containing spaces and `&` (e.g.
`"Trolleys & Baskets"`), which is not URL-safe — yet it is the unique key
used by storefront filtering (`kitchenware.html` filters by display name
match).

---

## 6. Data integrity observations

| Topic | Observation |
|---|---|
| Soft deletes | `Product.isActive` is the soft-delete flag. `Order` has no soft delete. |
| Cascades | Join tables (`ProductColor`, `ProductSize`, `ProductImage`, `StockMovement`, `Address`, `Session`, `CartItem`, `WishlistItem`, `OrderItem`, `OrderStatusEvent`) cascade-delete with their parent. |
| Optional relations | `Order.userId`, `OrderItem.productId` are SET NULL — preserves history. |
| Audit retention | `AuditLog.actorId` and `StockMovement.actorId` are not FKs — intentional, so audit survives user delete. |
| Uniqueness | `slug` unique on every lookup table; `User.email`, `Order.orderNumber`, `CartItem(userId, productId)`, `WishlistItem(userId, productId)` composite uniques. |
| Decimal precision | All money is `Decimal(10,3)` — correct for KWD. API often casts to `Number`, losing JS precision above 2^53. |
| JSON | `Product.specs Json` — stored as a stringified array; API parses with `JSON.parse` and silently falls back to `[]` on error. |
| Default address | `Address.isDefault` has no DB or app constraint to enforce a single default per user. |
| Unused capacity | `StockMovement`, `Setting` (beyond 2 rows), `Address` (no API writes), `Section`/`Subcategory` (admin supports but seed doesn't populate) are all under-utilised. |

---

## 7. Index strategy

Indexes are present on:

- All FKs (`categoryId`, `sectionId`, `departmentId`, `productId` everywhere,
  `userId` everywhere, `orderId`, `brandId`, `supplierId`).
- Hot filters: `Product.isActive`, `Product.barcode`, `Order.status`,
  `Order.customerEmail`, `AuditLog.entity`, `Session.expiresAt`.
- Time series: `StockMovement.createdAt`, all `createdAt` defaults.

**Missing indexes worth considering:**
- `Product.sku` — searched by store/admin but not indexed.
- `Product.tags` — GIN index for array containment if tag filtering is added.
- `Order.createdAt` — for date-range admin queries.

---

## 8. Unused / under-utilised schema capacity

These parts of the schema exist but have **no code path** writing to them:

| Model | Status |
|---|---|
| `StockMovement` | Defined, indexed; **never written** by any code. |
| `Address` | Defined; **no API route** creates/updates/deletes addresses. The admin GET reads them; the storefront never writes them. |
| `Section` | Schema + admin CRUD exist; **seed does not populate**; storefront does not surface sections. |
| `Subcategory` | Same as Section. |
| `Setting` | Only 2 keys seeded; no admin UI to edit; order placement does not read `shipping_fee` from Settings (it's hardcoded). |
| `OrderStatusEvent` | Written on every status change and on order creation; **read by no UI** (admin shows current status only, not the timeline). |
| `ProductImage` | Admin writes; **storefront reads `Product.image`/`images` instead** — `ProductImage` is largely orphaned from the storefront. |
| `Product.specs` | Stored as JSON; storefront displays it but admin form input is a free-text JSON field. |
| `REFUNDED` status | Enum value exists; no UI button to set it. |

These represent **schema-vs-implementation drift**: the data model is ahead
of the application layer.
