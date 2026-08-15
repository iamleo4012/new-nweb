# Database Audit

> Project: **nassim-platform** (AL-NASSIM)
> Audit date: 2026-07-21
> Method: **read-only** inspection of the live PostgreSQL database via Prisma's
> connection, combined with static analysis of `prisma/schema.prisma`.
> **No data was modified.**

This document is a deep-dive audit of the relational layer — every table,
relationship, index, constraint, naming convention, and the live-vs-schema
drift — plus identified risks around unused tables, missing indexes,
duplicate fields, normalization, performance, migrations, and security.

---

## Table of contents

1. [Connection & environment](#1-connection--environment)
2. [Inventory summary](#2-inventory-summary)
3. [Table-by-table audit](#3-table-by-table-audit)
4. [Relationships (FKs)](#4-relationships-fks)
5. [Constraints](#5-constraints)
6. [Indexes](#6-indexes)
7. [Naming conventions](#7-naming-conventions)
8. [Unused tables & dead schema capacity](#8-unused-tables--dead-schema-capacity)
9. [Missing indexes](#9-missing-indexes)
10. [Missing relations](#10-missing-relations)
11. [Duplicate / overlapping fields](#11-duplicate--overlapping-fields)
12. [Normalization analysis](#12-normalization-analysis)
13. [Performance analysis](#13-performance-analysis)
14. [Migration analysis](#14-migration-analysis)
15. [Security analysis](#15-security-analysis)
16. [Live-vs-schema drift](#16-live-vs-schema-drift)
17. [Consolidated findings & priorities](#17-consolidated-findings--priorities)

---

## 1. Connection & environment

| Property | Value |
|---|---|
| Server alias | `nassim` (configured MCP server) |
| Host | `localhost:5432` (from `.env` `DATABASE_URL`) |
| Database | `postgres` (default DB; **not** a dedicated app DB) |
| Schema | `public` |
| Role | `postgres` (superuser — used by the app) |
| PostgreSQL version | **18.3** (x86_64-windows, msvc-19.44.35222) |
| Total DB size | **10 MB** (dev-scale) |
| Active connections at audit | 8 |
| Migrations recorded | 2 (`_prisma_migrations` rows) |

**Environment observations**
- The app connects as the **`postgres` superuser** to a database literally
  named `postgres`. For production this is an anti-pattern: the app should
  use a dedicated database and a least-privilege role. See §15.
- Password in `DATABASE_URL` is `apple123` — weak, plaintext on disk in `.env`.
- Connection string uses `localhost`, so this is a local dev instance; the
  schema review below applies equally to any deployment of this codebase.

---

## 2. Inventory summary

| Metric | Count |
|---|---:|
| Application tables (excl. `_prisma_migrations`) | **27** |
| Enumerated types | **4** |
| Foreign-key constraints | **22** |
| Primary-key constraints | **27** (1 per table) |
| Unique constraints (non-PK) | **13** |
| Total indexes (incl. PKs/uniques) | **64** |
| Non-PK indexes | **35** |
| NOT NULL constraints | **156** |
| Total rows in app tables (live) | **198** (mostly 67 products + 81 audit + 12 sessions) |

### Tables, ordered by live row count

| Table | Rows | Seq scans | Total scans |
|---|---:|---:|---:|
| `AuditLog` | 81 | 5 | 6 |
| `Product` | 67 | **161** | 233 |
| `Session` | 12 | 7 | 184 |
| `Category` | 11 | 55 | 197 |
| `Order` | 4 | 30 | 67 |
| `OrderItem` | 4 | 14 | 27 |
| `OrderStatusEvent` | 6 | 6 | 7 |
| `User` | 3 | 15 | 233 |
| `Department` | 2 | 13 | 63 |
| `Setting` | 2 | 6 | 12 |
| `Brand` | 0 | 8 | 17 |
| `Material` | 0 | 7 | 15 |
| `Color` | 0 | 8 | 14 |
| `Size` | 0 | 10 | 15 |
| `Unit` | 0 | 8 | 16 |
| `Country` | 0 | 7 | 15 |
| `Supplier` | 0 | 7 | 16 |
| `Tax` | 0 | 9 | 16 |
| `Section` | 0 | 11 | 20 |
| `Subcategory` | 0 | 12 | 18 |
| `Address` | 0 | 4 | 8 |
| `StockMovement` | 0 | 5 | 2 |
| `ProductColor` | 0 | 4 | 10 |
| `ProductSize` | 0 | 4 | 10 |
| `ProductImage` | 0 | 4 | 7 |
| `CartItem` | 0 | 10 | 11 |
| `WishlistItem` | 0 | 10 | 11 |

> The audit trail shows the admin has been exercised (81 audit rows across 14
> entity types — brand/color/country/material/supplier/tax/unit/section/size/
> subcategory/categories/department/Product/Order). The product inventory is
> the only sizeable table (67 rows) and it is hit hard by seq scans (§13).

---

## 3. Table-by-table audit

Below, each table is summarised with its purpose, key columns, and the
specific issues found. Column-level typing and nullability were verified
against the live `information_schema.columns`.

### 3.1 `Department`
- **Columns:** `id` (serial PK), `slug` (text, unique), `name`, `purchaseMode`
  (`PurchaseMode` enum, default `ONLINE`).
- **Live:** 2 rows — `houseware`/ONLINE (11 categories), `warehouse`/INQUIRY
  (**0 categories** — see §3.3 / §16).
- **Issues:** None structurally.

### 3.2 `Section`
- **Columns:** `id`, `slug` (unique), `name`, `departmentId` (FK → Department,
  ON DELETE RESTRICT).
- **Live:** 0 rows. **Never seeded.** Index `Section_departmentId_idx` exists
  but unused.
- **Issues:** Defined + indexed but entirely empty; admin supports CRUD but
  storefront ignores.

### 3.3 `Category` — **contains live data-quality bugs**
- **Columns:** `id`, `slug` (unique), `name`, `departmentId` (FK RESTRICT),
  `sectionId` (nullable FK SET NULL).
- **Live:** 11 rows, **all with `departmentId=1` (houseware)**. `warehouse`
  (id=2) has 0 categories.
- **Critical live-data issue:** every `slug` is a **display name containing
  spaces and `&`**, not a URL-safe slug:
  - `"Cooling Appliances"`, `"Trolleys & Baskets"`, `"Shelves & Stands"`,
    `"Warehouse Equipment"`, `"Kitchenware"`, `"Cleaning Tools"`,
    `"Checkout Solutions"`, `"Accessories"`, `"Tableware"`, `"Home Care"`,
    `"Ceramics"`.
  - These slugs are unique keys and are used as URL fragments/filter keys by
    the storefront. They violate the slug contract that the rest of the
    codebase assumes (`^[a-z0-9-]+$` in zod validators).
- **Root cause:** `prisma/seed.mjs` derives slugs from `p.category` display
  names and never matches them against the `INQUIRY_CATEGORIES` slug set.
- **Indexes:** `Category_sectionId_idx` is **0 scans** (no sections in use).

### 3.4 `Subcategory`
- **Columns:** `id`, `slug` (unique), `name`, `categoryId` (FK RESTRICT).
- **Live:** 0 rows.
- **Issues:** Same as Section — defined but unused.

### 3.5 `Brand` / `Material` / `Color` / `Size` / `Unit` / `Country`
- **Columns (all):** `id`, `slug` (unique), `name`; `Color` adds `hex`.
- **Live:** 0 rows each, but `idx_scan > 0` shows the admin panel queries
  them (e.g. `Brand_pkey` 14 scans, `Color_pkey` 11 scans).
- **Issues:** None structurally. Each is referenced as an optional FK from
  `Product`. They have been exercised in the admin (audit log shows create/
  delete cycles).

### 3.6 `Supplier`
- **Columns:** `id`, `slug` (unique), `name`, `contact`, `phone`, `email`
  (all `NOT NULL` with `''` defaults).
- **Live:** 0 rows.
- **Issues:** `email` has no format check (just text); `phone` likewise.
  No uniqueness on email/phone (intentional?).

### 3.7 `Tax`
- **Columns:** `id`, `slug` (unique), `name`, `rate` `Decimal(6,3)`.
- **Live:** 0 rows.
- **Issues:** None structurally. **Note:** no orders actually apply tax —
  `Order.subtotal`/`total` never reference a tax computation.

### 3.8 `Product` — **the centre of the schema**
- **Columns:** 38 fields. Identity, commerce, inventory, SEO, dimensions,
  JSON specs, array tags, 7 optional FKs + 1 required (`categoryId`).
- **Live:** 67 rows. `images[]` and `image` populated for all; **`barcode`
  is empty (`''`) on all 67 rows** (so `Product_barcode_idx` is unused).
- **Issues:**
  - **Triple image storage** — `image` (text), `images` (text[]), and the
    separate `ProductImage` table all coexist. `ProductImage` has **0 rows**
    in the live DB while `image`/`images` are populated. See §11.
  - `sku` is unique-by-coincidence (67 distinct, none empty) but **has no
    unique constraint or index** — only `slug` is unique.
  - `barcode` indexed but unused (all empty).
  - `tags text[]` and `specs jsonb` lack GIN indexes.
  - **Denormalised `currency`** on every row (always `"KD"`).
  - `specs` defaults to `'[]'::jsonb` — good (typed JSON).

### 3.9 `ProductColor` / `ProductSize`
- **Composite PK** `("productId", "colorId")` / `("productId", "sizeId")`.
- **Live:** 0 rows each (no variant data populated).
- **Issues:** None structurally; properly modelled M:N join tables.

### 3.10 `ProductImage`
- **Columns:** `id`, `productId` (FK CASCADE), `url`, `sortOrder`, `isPrimary`.
- **Live:** 0 rows.
- **Issues:** **Overlaps functionally with `Product.image`/`images`** — see
  §11. Admin writes here but storefront reads the array columns instead.

### 3.11 `StockMovement`
- **Columns:** `id`, `productId` (FK CASCADE), `delta`, `reason`, `note`,
  `actorId` (int, **no FK**), `createdAt`.
- **Live:** 0 rows. **Never written by any code path.**
- **Issues:** Defined + indexed on `productId` and `createdAt` but the column
  is dead capacity. `actorId` is not a FK to `User` (intentional — audit-style).

### 3.12 `User`
- **Columns:** `id`, `email` (unique), `name`, `phone`, `passwordHash`,
  `role` (`UserRole`), `isActive`, timestamps.
- **Live:** 3 rows (1 ADMIN, 2 CUSTOMER).
- **Issues:** `phone` is plain text with no format check; no email format
  constraint at DB level (only app-side Zod normalises to lowercase).
  `passwordHash` cost = 10 (handled in app).

### 3.13 `Session`
- **Columns:** `id` (text PK — server-generated UUID string), `userId` (FK
  CASCADE), `expiresAt`, `createdAt`.
- **Live:** 12 rows. `Session_pkey` is **the most-scanned index in the DB
  (173 scans)** — every API call validates the session.
- **Issues:** `Session_expiresAt_idx` is **0 scans** — see §13/§9. No
  automatic pruning of expired rows (a cron / scheduled job would be needed).

### 3.14 `Address`
- **Columns:** `id`, `userId` (FK CASCADE), `label`, `fullName`, `phone`,
  `address`, `city`, `area`, `isDefault`.
- **Live:** 0 rows. **No API route writes to this table.**
- **Issues:** `isDefault` boolean has **no partial unique constraint** to
  enforce a single default per user. Same `phone` plain-text concern.

### 3.15 `CartItem` / `WishlistItem`
- **Columns:** `CartItem`: `id`, `userId`, `productId`, `quantity`, `updatedAt`;
  composite unique `("userId","productId")`. `WishlistItem` similar + `createdAt`.
- **Live:** 0 rows each (storefront uses localStorage).
- **Issues:** **`CartItem` is never used by the storefront** despite having a
  full `/api/cart` route. Same for wishlist server-sync (only when logged in).
  Indexes are healthy when used (11 scans).

### 3.16 `Order` — **integrity gaps**
- **Columns:** `id`, `orderNumber` (unique), `userId` (nullable FK SET NULL),
  snapshot fields (`customerName/Email/Phone/address/city/notes`), `status`
  enum, `subtotal`/`shipping`/`total` `Decimal(10,3)`, `currency`, timestamps.
- **Live:** 4 rows (2 PENDING, 2 CONFIRMED).
- **Issues:**
  - `Order_orderNumber_key` (unique) is **0 scans** — no admin/customer
    lookup by `orderNumber` is happening, despite it being the obvious
    customer-facing key.
  - `Order_status_idx` 0 scans, `Order_customerEmail_idx` 0 scans — the
    admin's status filter does not use the index (see §13).
  - `shipping` defaults to `2.5` but the application **trusts the client
    value** (`app/api/orders/route.ts:85`).
  - No payment-method column; COD is implicit via the status note string.

### 3.17 `OrderItem`
- **Columns:** `id`, `orderId` (FK CASCADE), `productId` (nullable FK SET NULL),
  snapshot `slug/name/image/price/quantity`.
- **Live:** 4 rows.
- **Issues:** `productId` is `SET NULL` on product delete — but `Product`
  deletes are **soft** (`isActive=false`), so this rarely fires. The snapshot
  fields are correctly captured (no FK to product price).

### 3.18 `OrderStatusEvent`
- **Columns:** `id`, `orderId` (FK CASCADE), `status` enum, `note`, `createdAt`.
- **Live:** 6 rows (more than `Order` rows because initial placement + status
  changes both write events).
- **Issues:** `OrderStatusEvent_orderId_idx` is **0 scans** — the timeline
  is **never read by any UI** despite being written on every status change.
  Also no FK from `OrderItem.productId` to product is enforced here.

### 3.19 `Setting`
- **Columns:** `key` (text PK), `value` (text).
- **Live:** 2 rows — `currency=KD`, `shipping_fee=2.5`.
- **Issues:** `shipping_fee` is **not read by the checkout route** (which
  trusts client-supplied shipping). The setting is effectively documentation.

### 3.20 `AuditLog`
- **Columns:** `id`, `actorId` (int, **no FK**), `action`, `entity`,
  `entityId` (text), `detail`, `createdAt`.
- **Live:** 81 rows across 14 entity types.
- **Issues:** `AuditLog_entity_idx` is **0 scans** — no UI reads the log.
  `actorId` is intentionally not a FK (audit must survive user delete).
  `entityId` is text (heterogeneous IDs) — fine but prevents typed joins.

---

## 4. Relationships (FKs)

**22 foreign keys**, all with explicit `ON UPDATE CASCADE` and an explicit
`ON DELETE` policy:

| Policy | Count | Examples |
|---|---:|---|
| `ON DELETE CASCADE` | 12 | Address→User, CartItem→User/Product, ProductImage→Product, Session→User, OrderItem→Order, OrderStatusEvent→Order |
| `ON DELETE RESTRICT` | 4 | Category→Department, Product→Category, Section→Department, Subcategory→Category |
| `ON DELETE SET NULL` | 6 | Order→User, OrderItem→Product, Product→(all optional lookup FKs: brand/material/supplier/unit/country/tax/subcategory) |

**Relationship graph (simplified)**
```
Department ─┬─< Section ─< (Category.sectionId optional)
            └─< Category ─┬─< Subcategory ─< Product (subcategoryId optional)
                          └─< Product
                                ├──< ProductImage, ProductColor, ProductSize, StockMovement
                                ├──< OrderItem, CartItem, WishlistItem
                                └── Brand/Material/Supplier/Unit/Country/Tax (all optional M:1)

User ─┬─< Session, Address, CartItem, WishlistItem
      └──< Order (nullable) ─< OrderItem ── (Product, nullable)
                            └─< OrderStatusEvent

AuditLog (actorId → User, not enforced)
Setting (standalone)
```

**Findings**
- ✅ Every FK has an explicit `ON DELETE` — no implicit defaults.
- ✅ Cascade direction is correct: child tables cascade; parent tables
  (`Department`, `Category`) restrict; soft-relations (`Order→User`,
  `OrderItem→Product`) set NULL to preserve history.
- ⚠️ **No FK from `AuditLog.actorId` or `StockMovement.actorId` to `User`.**
  Intentional for audit retention but worth documenting.
- ⚠️ **`OrderItem.productId` SET NULL** combined with **Product soft-delete**
  means the SET NULL never fires — orphan rows cannot occur but the
  constraint is misleading. Functionally harmless.

---

## 5. Constraints

**212 named constraints** total (excluding `_prisma_migrations`).

| Type (`contype`) | Count | Purpose |
|---|---:|---|
| `p` (PRIMARY KEY) | 27 | One per table; `ProductColor`/`ProductSize` use composite PKs |
| `f` (FOREIGN KEY) | 22 | See §4 |
| `u` (UNIQUE) | 13 | All on `slug` columns + `User.email`, `Order.orderNumber`, composite uniques on `CartItem`/`WishlistItem` |
| `n` (NOT NULL) | 156 | All non-optional columns |

**Findings**
- ✅ Constraint naming is consistent: `<Table>_<col>_fkey`, `<Table>_<col>_key`
  (unique), `<Table>_pkey`, `<Table>_<col>_idx` (index), `<Table>_<col>_not_null`.
- ✅ No anonymous constraints — every one is named, aiding migrations.
- ⚠️ **No `CHECK` constraints anywhere.** All validation lives in the app
  (Zod). The DB does not enforce:
  - `Product.price >= 0`, `discount >= 0`, `costPrice >= 0`
  - `Tax.rate >= 0`
  - `Product.stock >= 0`, `minStock >= 0`
  - `Order.subtotal/total >= 0`, `shipping >= 0`
  - `CartItem.quantity > 0`
  - `Color.hex` format (e.g. `^#[0-9A-Fa-f]{6}$`)
  - `User.email` format
  - Single default address per user (partial unique on `Address(userId) WHERE
    "isDefault"`)
- ⚠️ **`Order.shipping` accepts any value 0-100** because no DB rule caps it.
  Combined with the app trusting the client value, this is an integrity gap
  (see §15).

---

## 6. Indexes

**64 indexes total** (35 non-PK). All are **btree**. No GIN, GiST, BRIN,
hash, or partial indexes anywhere.

### 6.1 Index usage (from `pg_stat_all_indexes`)

**Hot indexes (most used):**
| Index | Scans | Notes |
|---|---:|---|
| `Session_pkey` | **173** | Every API auth check |
| `User_pkey` | **197** | Every auth + admin customer fetch |
| `Category_pkey` | 131 | Catalog tree |
| `Department_pkey` | 43 | Catalog tree |
| `Product_slug_key` | 67 | Catalog lookups |
| `Order_pkey` | 33 | Admin order list |
| `User_email_key` | 21 | Login/register |

**Cold indexes (0 scans — never used since last reset):**
| Index | Table | Size | Verdict |
|---|---|---|---|
| `Product_barcode_idx` | Product | 16 kB | **Unused** — all barcodes empty |
| `Product_isActive_idx` | Product | 16 kB | Cold today; will be hot in production |
| `Product_categoryId_idx` | Product | 16 kB | **Cold despite admin category filter** — see §13 |
| `Product_brandId_idx` | Product | 16 kB | Unused |
| `Product_supplierId_idx` | Product | 16 kB | Unused |
| `Category_sectionId_idx` | Category | 16 kB | No sections in use |
| `Session_expiresAt_idx` | Session | 16 kB | **Should be used for expired-session pruning** |
| `Order_orderNumber_key` | Order | 16 kB | Unique; never scanned → no `orderNumber` lookups |
| `Order_status_idx` | Order | 16 kB | Admin status filter bypasses it (see §13) |
| `Order_customerEmail_idx` | Order | 16 kB | Unused |
| `OrderStatusEvent_orderId_idx` | OrderStatusEvent | 16 kB | Timeline never read |
| `AuditLog_entity_idx` | AuditLog | 16 kB | Audit log never queried |
| `StockMovement_createdAt_idx` | StockMovement | 8 kB | Table empty |

> **13 of 35 non-PK indexes are cold.** Some (e.g. `Product_isActive_idx`,
> `Order_status_idx`) will become hot in production; others (`Product_barcode_idx`,
> `AuditLog_entity_idx`, `OrderStatusEvent_orderId_idx`) reflect features that
> exist in the schema but not in the UI.

### 6.2 Index size
Every index is **8–16 kB** because the tables are tiny (≤67 rows). At this
scale index choice has no measurable performance impact — but the patterns
established now will matter when the DB grows. See §13.

---

## 7. Naming conventions

| Convention | Status |
|---|---|
| Table names | ✅ Singular PascalCase (`Product`, `OrderItem`) — matches Prisma default |
| Column names | ✅ camelCase (`categoryId`, `isActive`, `createdAt`) — also Prisma default |
| Reserved-word tables (`Order`, `User`) | ✅ Double-quoted everywhere in DDL (`"Order"`, `"User"`) — correct |
| FK constraint names | ✅ `<Table>_<col>_fkey` |
| Unique constraint names | ✅ `<Table>_<col>_key` |
| PK constraint names | ✅ `<Table>_pkey` |
| Index names | ✅ `<Table>_<col>_idx` |
| Enum names | ✅ PascalCase (`OrderStatus`, `StockStatus`, `UserRole`, `PurchaseMode`) |
| Slug columns | ⚠️ Convention says `slug` is `^[a-z0-9-]+$` (enforced in Zod) but **live `Category.slug` rows violate it** |

**Findings**
- Naming is consistent and Prisma-idiomatic. Good.
- The one inconsistency is **runtime data**: `Category.slug` contains spaces
  and `&` in the live DB. The schema does not enforce slug format with a
  `CHECK` constraint, so the seed was able to write invalid slugs.

---

## 8. Unused tables & dead schema capacity

The following tables are defined, indexed, and have NO live rows **and** are
not written by any current code path:

| Table | Schema | API | Admin | Storefront | Verdict |
|---|:-:|:-:|:-:|:-:|---|
| `StockMovement` | ✅ | ❌ never written | ❌ | ❌ | **Dead** — order placement decrements `Product.stock` directly |
| `Address` | ✅ | ❌ no route | read-only in detail | ❌ | **No create/update/delete path** |
| `ProductImage` | ✅ | (via product) | writes | ❌ reads `image`/`images` | **Storefront bypasses it** |
| `Section` | ✅ | full CRUD | full CRUD | ❌ | Defined but empty + unused by store |
| `Subcategory` | ✅ | full CRUD | full CRUD | ❌ | Same |
| `CartItem` | ✅ | full API | ❌ | ❌ uses localStorage | **Server cart API unused by UI** |

> These are **schema-ahead-of-implementation** tables. They are not bugs per
> se, but they represent ~30% of the schema that is not earning its keep.

---

## 9. Missing indexes

Identified by matching query patterns in the app code against existing indexes:

| Query pattern (source) | Column(s) | Current index? | Recommendation |
|---|---|---|---|
| Admin product list filter by `isActive` + `categoryId` (`admin/products/route.ts`) | `isActive`, `categoryId` | Both indexed separately | Composite `(isActive, categoryId)` would serve the common filter; or partial index `WHERE isActive=true` |
| Storefront search `OR (name/description/sku/line ILIKE '%q%')` (`products/route.ts`) | text columns | None | ILIKE with leading wildcard cannot use btree; consider `pg_trgm` GIN index for fuzzy search |
| Product filter by `tags @> ARRAY[...]` | `tags` | None | **GIN index on `tags`** (array containment) |
| Product filter by `specs @> ...` | `specs` | None | **GIN index on `specs`** (jsonb containment) |
| Admin order sort by `createdAt` | `createdAt` | None | Index on `Order.createdAt` (currently admin does `findMany take:200` with no ORDER BY) |
| Customer order history by `(userId, createdAt)` | composite | `userId` only | Composite `(userId, createdAt DESC)` |
| `Product.sku` lookup (planned for admin) | `sku` | None (only `slug` unique) | Unique index on `sku` if SKUs are meant to be unique |
| Audit log search by `(entity, createdAt)` | composite | `entity` only | Composite for time-range audit queries |

**Existing-but-cold indexes that should stay** (will be needed in production):
`Product_isActive_idx`, `Order_status_idx`, `Order_customerEmail_idx`,
`Session_expiresAt_idx` (for pruning).

---

## 10. Missing relations

Relations that exist as integer columns but **lack a FK constraint**:

| Table.column | Should reference | Currently | Risk |
|---|---|---|---|
| `AuditLog.actorId` | `User.id` | plain int, no FK | **Intentional** — audit must survive user deletion. OK. |
| `StockMovement.actorId` | `User.id` | plain int, no FK | Same — OK, but table is unused anyway. |

Relations that **should exist but don't** (functional gaps):

| Missing relation | Impact |
|---|---|
| `Order.paymentMethodId` → `PaymentMethod` | No way to distinguish COD vs online (when added). |
| `Order.shippingMethodId` → `ShippingMethod` | Shipping is a hardcoded 2.5 / client-supplied. |
| `Order.addressId` → `Address` | Orders snapshot address text rather than linking. |
| `User` ↔ `Order` (placed-by-staff) | No `staffId` on `Order` for orders created on behalf of a customer. |
| `Coupon` / `Discount` tables | Discount codes not modelled (only per-product `discount` column). |
| `Product.tags` normalisation | Tags stored as a flat array — no `Tag` table for faceted counts. |

These are forward-looking design recommendations, not bugs in the current scope.

---

## 11. Duplicate / overlapping fields

### 11.1 🔴 Product images — **triple storage**

`Product` has **three overlapping ways to store images**:

| Field | Type | Live usage | Written by | Read by |
|---|---|---|---|---|
| `Product.image` | `text` | 67/67 non-empty | seed | Storefront (PDP) |
| `Product.images` | `text[]` | 67/67 non-empty | admin form | Storefront (cart/wishlist tiles) |
| `ProductImage` table | rows | **0 rows** | admin media library | **Nothing** |

Verified live: 67 products have `image` set, 67 have non-empty `images[]`,
and 0 have any `ProductImage` rows. The admin's media library writes to
`ProductImage` and `images[]` but the storefront reads `image`/`images` —
so the rich `ProductImage` model (with `sortOrder`, `isPrimary`) is
**orphaned from the read path**.

**Recommendation:** pick one source of truth. Either (a) make `ProductImage`
the canonical store and have the storefront read it, or (b) drop
`ProductImage` and `image`, keeping only `images[]` with a convention for
the first element being primary.

### 11.2 🟡 `currency` repeated on `Product` and `Order`

`Product.currency` (always `"KD"`) and `Order.currency` (always `"KD"`) are
denormalised onto every row. With a single currency this is harmless; if
multi-currency is ever added, this should move to a `Currency` table or to
`Setting`.

### 11.3 🟡 Order snapshot fields duplicate live data

`OrderItem.slug/name/image/price` snapshot the product at order time. This is
**correct denormalisation** for an order (you want the historical record) —
not a bug, just worth noting.

### 11.4 🟡 `Category.name` vs `Category.slug`

In the live DB these are **identical** for all 11 rows (because the seed
copied display names into `slug`). When slugs are fixed, `name` (display) and
`slug` (URL key) should diverge as designed.

### 11.5 🟢 `Order.status` vs `OrderStatusEvent`

The current `Order.status` is denormalised from the latest `OrderStatusEvent`.
Again, this is a standard pattern (fast read of current state + append-only
history). The only issue is that the history is never read (§3.18).

---

## 12. Normalization analysis

The schema is in **3NF overall**, with deliberate, well-considered
denormalisation:

### 12.1 Properly normalised
- All lookup tables (Brand, Material, Color, Size, Unit, Country, Tax,
  Supplier, Department, Section, Category, Subcategory) are 3NF — atomic
  values, no transitive dependencies.
- M:N join tables (`ProductColor`, `ProductSize`) use composite PKs.
- `User`/`Session`/`Address` are clean.
- `AuditLog` is an append-only event log (correct shape).

### 12.2 Deliberate denormalisation (acceptable)
- `Order` snapshots `customerName/Email/Phone/address/city` — correct, the
  customer may change their details but the order must retain the original.
- `OrderItem` snapshots `slug/name/image/price` — correct, product may change.
- `Order.status` mirrors the latest `OrderStatusEvent.status` — correct, fast read.

### 12.3 Denormalisation that should be revisited
- **`Product.image` + `Product.images[]` + `ProductImage` table** — three
  representations of the same concept. Pick one. (§11.1)
- **`Product.currency` + `Order.currency`** — duplicated constant. (§11.2)
- **`Order.shipping`** — stored as a value but the source of truth should be a
  `ShippingMethod` row or a `Setting` (currently ignored).
- **`Address.isDefault`** — boolean flag with no constraint to ensure a single
  default per user (a partial unique index would fix this).

### 12.4 First-normal-form concerns
- `Product.tags text[]` — array column. Acceptable in PostgreSQL but makes
  faceted aggregation harder. A `Tag` table + `ProductTag` join would be
  more relational.
- `Product.specs jsonb` — unstructured JSON. Acceptable for variable specs
  but cannot be indexed relationally without GIN.

---

## 13. Performance analysis

At current scale (10 MB DB, ≤67 rows per table), **performance is a non-issue
today**. The findings below are about **established patterns that will bite
as data grows**.

### 13.1 🔴 Seq scans on `Product` — 161 seq scans / 10,115 tuples read

`Product` is the most seq-scanned table in the live DB (161 seq scans reading
10,115 tuples). Several non-PK `Product` indexes (`categoryId`, `isActive`,
`brandId`, `supplierId`, `barcode`) are **0 scans** — meaning queries that
*should* use them are falling back to seq scans.

**Root cause:** the storefront catalog endpoint (`/api/catalog`) and admin
product list (`/api/admin/products`) both call `prisma.product.findMany()`
with broad filters and no LIMIT on the admin side. At 67 rows the planner
correctly picks a seq scan (it's faster); at 67,000 rows it will still work,
but the missing composite indexes (§9) will start to hurt.

### 13.2 🟠 Catalog endpoints force-dynamic with no caching

`app/api/catalog/route.ts`, `products/route.ts`, `categories/route.ts` all
set `export const dynamic = "force-dynamic"`. Combined with `Cache-Control:
no-store` on `/api/catalog`, this means **every page load of every category
page issues a fresh full-table scan of `Product`**. The catalog is the
read-heaviest data and is served with zero caching.

### 13.3 🟠 `Order_status_idx` not used despite admin status filter

The admin orders page filters by `?status=…`. The route
(`admin/orders/route.ts`) does pass the status into the `where`, but the
`idx_scan=0` on `Order_status_idx` suggests the planner chooses a seq scan
because there are only 4 rows. Correct now; will flip to index scan as
orders grow. No action needed yet.

### 13.4 🟡 ILIKE search with leading wildcard

`products/route.ts` uses `OR (name/description/sku/line ILIKE '%q%')`. Leading
wildcards cannot use a btree index. For real search at scale, the
`pg_trgm` extension + a GIN trigram index (or PostgreSQL full-text search
with `tsvector`) is needed.

### 13.5 🟡 No pagination on several admin reads

`/api/admin/products` returns the full product list; `/api/admin/orders`
caps at `take: 200` with no pagination cursor. These will degrade linearly
with catalog/order growth.

### 13.6 🟡 Session table grows unbounded

`Session` has 12 rows, but expired sessions are never pruned. `Session_expiresAt_idx`
exists but is unused. A scheduled `DELETE FROM "Session" WHERE "expiresAt" < now()`
would keep the table small and the auth-check fast.

### 13.7 🟢 Autovacuum not yet run

`last_vacuum` and `last_analyze` are **NULL on every table** — autovacuum has
not yet kicked in (the DB is too small). Normal for a dev DB; will start
automatically as it grows.

---

## 14. Migration analysis

### 14.1 Migration history (`_prisma_migrations`)

| Migration | Applied | Status |
|---|---|---|
| `20260720164813_init` | finished | ✅ |
| `20260720194752_phase2_erp_master_data` | finished | ✅ |

No rolled-back migrations. `migration_lock.toml` pins provider to `postgresql`.

### 14.2 Migration quality

- ✅ Both migrations are **additive only** — no `DROP`, no type changes, no
  nullability flips on existing columns.
- ✅ Every new non-null column in phase 2 carries a `DEFAULT`, so backfill
  was safe.
- ✅ The two migrations are **fully in sync with `prisma/schema.prisma`** — a
  `prisma migrate status` would report no drift. Live `information_schema`
  matches the schema file.
- ⚠️ **`ALTER TYPE "OrderStatus" ADD VALUE 'REFUNDED'`** (phase 2) is
  non-transactional in PostgreSQL — Prisma handles this by stripping the
  surrounding txn, but be aware this migration **cannot be replayed inside a
  multi-statement transaction** if you ever replay it manually. Adding
  values to an enum is irreversible without a full enum rebuild.
- ⚠️ **No down migrations** — Prisma's `migrate dev` produces forward-only
  SQL. Combined with the additive-only style, rollbacks would have to be
  hand-written.

### 14.3 Potential migration risks going forward

| Risk | Detail |
|---|---|
| Enum value removal | `OrderStatus` / `StockStatus` / `UserRole` values cannot be removed without rebuilding the enum (PG limitation). Adding is fine. |
| Slug cleanup | Fixing the 11 invalid `Category.slug` values requires an `UPDATE` that must respect the unique constraint; backfill should be tested on a shadow DB. |
| Image-store consolidation | Merging `image`/`images`/`ProductImage` into one will require a data migration that synthesises `ProductImage` rows from `images[]`. |
| Adding `CHECK` constraints | Adding `CHECK (price >= 0)` etc. requires all existing rows to satisfy it; safe today (no negative prices) but the migration must use `NOT VALID` + `VALIDATE` on a large table to avoid a long lock. |
| Adding NOT NULL columns | Future NOT NULL additions should always include a `DEFAULT` (the existing pattern) or use a multi-step migration to avoid locking. |
| Renaming reserved-word tables | `"Order"` and `"User"` are double-quoted everywhere; renaming would be a large mechanical change. Leave as-is. |

---

## 15. Security analysis

### 15.1 🔴 Connection uses the `postgres` superuser

`DATABASE_URL=postgresql://postgres:apple123@localhost:5432/postgres`. The
app connects as the **superuser** to the **default maintenance database**
(`postgres`). If the app is compromised (e.g. via SQL injection — unlikely
here since no raw SQL — or a misconfigured route), the attacker has full
control of the DB cluster.

**Recommendation:** create a dedicated role (`nassim_app`) with privileges
only on the app schema, and a dedicated database (`nassim`); rotate the
password.

### 15.2 🔴 Weak DB password

`apple123` is in the top-100 most common passwords. Plaintext on disk in `.env`.

### 15.3 🟠 No row-level security / column-level grants

All data is accessible to the single app role. There is no separation between
"customer can read their own orders" and "admin can read all" at the DB
layer — this is enforced only in the API (`requireStaff`). Adding RLS would
be defense-in-depth.

### 15.4 🟠 PII stored in plaintext

`User.phone`, `User.passwordHash`, `Address.*`, `Order.customerEmail/Phone/
address` are all plaintext. `passwordHash` is correctly bcrypt-hashed (good),
but PII like phone and address has no encryption-at-rest beyond PostgreSQL's
normal storage.

### 15.5 🟠 Audit log is mutable

`AuditLog` rows have no immutability protection. Any app path with
`prisma.auditLog.update` / `delete` access could tamper with the trail.
Consider revoking UPDATE/DELETE on `AuditLog` from the app role.

### 15.6 🟡 Order total integrity

`Order.shipping` is `Decimal(10,3)` with no CHECK constraint and is trusted
from the client. A malicious client can submit `shipping: 0` to `100`. The
`Order.subtotal` is recomputed server-side (good), but `total = subtotal +
shipping` inherits the manipulation. (Mirrors the API finding; the DB layer
could prevent it with a `CHECK (shipping BETWEEN 0 AND 100)` rule.)

### 15.7 🟡 No CHECK constraints (defence-in-depth gap)

As noted in §5, there are zero `CHECK` constraints. Adding them would catch
application bugs that Zod misses (e.g. a future code path that bypasses
Zod). High-value checks: non-negative prices/stocks/totals, valid hex on
`Color.hex`, non-empty email format.

### 15.8 🟢 Strengths

- ✅ All queries use Prisma parameterised queries — **no SQL-injection surface**.
- ✅ `passwordHash` is never selected in API responses (`publicUser` strips it).
- ✅ `User` unique constraint on `email` prevents duplicate accounts at the DB.
- ✅ Sessions are DB-backed (revocable) and checked for expiry + `isActive`.
- ✅ Soft-delete (`Product.isActive`) instead of hard delete preserves data.

---

## 16. Live-vs-schema drift

Cross-checking `prisma/schema.prisma` against the live `information_schema`:

| Check | Result |
|---|---|
| Table count (27 app tables) | ✅ Match |
| Column count and types | ✅ Match (verified per table) |
| FK definitions | ✅ Match |
| Index definitions | ✅ Match (64 indexes) |
| Enum values | ✅ Match (4 enums, all values present) |
| `_prisma_migrations` state | ✅ Both migrations applied |

**There is no schema drift.** The live DB is exactly what the migrations
produce from `schema.prisma`. The issues below are **data** drift and
**schema-vs-code** drift, not schema-vs-DB drift:

| Drift item | Type | Severity |
|---|---|---|
| `Category.slug` contains spaces/`&` (live) vs `^[a-z0-9-]+$` (Zod) | **Data drift** | 🔴 High |
| All 11 categories in `houseware`; `warehouse` dept empty (live) vs intended routing (seed intent) | **Data drift** | 🔴 High |
| `Product.barcode` empty on all 67 rows (live) vs `Product_barcode_idx` (schema) | **Data/schema mismatch** | 🟡 Medium |
| `ProductImage` 0 rows (live) vs admin writes (code) | **Code/schema drift** | 🟡 Medium |
| `StockMovement` 0 rows (live) vs defined table (schema) | **Code/schema drift** | 🟡 Medium |
| `Address` 0 rows (live) + no API (code) vs defined table (schema) | **Code/schema drift** | 🟡 Medium |
| `CartItem` 0 rows (live) + unused by storefront (code) vs defined table (schema) | **Code/schema drift** | 🟡 Medium |
| `OrderStatusEvent` written but unread (code) vs indexed table (schema) | **Code/schema drift** | 🟡 Medium |

---

## 17. Consolidated findings & priorities

### Critical (data / security)
1. **Invalid `Category.slug` data** — all 11 rows contain spaces/`&`; breaks
   the slug contract. Requires a data migration to slugify.
2. **`warehouse` department is empty** — seed bug routed everything to
   `houseware`; the INQUIRY purchase mode is unreachable.
3. **App connects as `postgres` superuser** to the `postgres` maintenance DB
   with a weak password (`apple123`).

### High (integrity / design)
4. **Triple image storage** on `Product` — pick one canonical store.
5. **Order `shipping` trusted from client** with no DB-side cap.
6. **No CHECK constraints** — negative prices/stocks/totals are DB-legal.
7. **`StockMovement`, `Address`, `ProductImage`** tables exist but are
   unwritten or unread.
8. **Audit log is mutable** — no immutability guarantee.
9. **No expired-session pruning** — `Session` grows unbounded.

### Medium (performance / forward-looking)
10. **No GIN indexes on `tags`/`specs`** — faceted queries will table-scan.
11. **No trigram/full-text index** for ILIKE search.
12. **Public catalog endpoints force-dynamic + no-store** — read-heavy path
    is uncached.
13. **Admin lists have no pagination** — linear degradation.
14. **No composite indexes** for multi-column filters (e.g. `isActive` +
    `categoryId` on `Product`).
15. **`Product.sku` has no unique constraint** despite being used as an
    identifier.

### Low (polish)
16. **13 of 35 non-PK indexes are cold** — some will warm up, others
    (`barcode`, `AuditLog.entity`, `OrderStatusEvent.orderId`) reflect
    unused features.
17. **`Address.isDefault` no partial unique** — multiple defaults possible.
18. **No down migrations** — Prisma is forward-only here.
19. **Naming convention** is excellent; the only deviation is live `slug`
    data (covered in #1).

### Verdict

The schema is **well-modelled, internally consistent, and in sync with the
migrations and the Prisma file**. The relationships are correct, the cascade
policies are sensible, and the naming is disciplined. The problems are
concentrated in three areas: **(a) live data quality** (invalid slugs,
empty warehouse department, empty barcode column), **(b) schema that is
ahead of the code** (StockMovement, Address, ProductImage, server cart), and
**(c) missing defence-in-depth at the DB layer** (no CHECK constraints,
superuser connection, mutable audit log). None of these are blocking for
continued development, but items #1–#3 should be fixed before any production
deployment, and #4–#9 should be on the roadmap before launch.
