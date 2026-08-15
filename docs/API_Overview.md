# API Overview

> Project: **nassim-platform**
> Audit date: 2026-07-21
> Base URL: `/api` (Next.js 15 Route Handlers)

This document catalogs every API route, the HTTP methods it exposes, the
auth/authorization rules, validation, and notable behaviour. Source files
live under `app/api/**/route.ts`.

---

## 1. Conventions

| Concern | Pattern |
|---|---|
| **Response shape** | `{ success: boolean, data?: …, error?: string }` (with minor inconsistencies — see §4) |
| **Auth (user)** | `getSessionUser()` from `lib/auth.ts` → 401 if null |
| **Auth (admin)** | `requireStaff()` from `lib/auth.ts` → 401/403 if null (admits `ADMIN` or `STAFF`) |
| **Validation** | Inline Zod schemas defined inside each route file |
| **Body parsing** | Manual `await request.json()` wrapped in try/catch → 400 on failure |
| **DB access** | Prisma parameterized queries only — zero raw SQL |
| **Caching** | `export const dynamic = "force-dynamic"` on most routes |
| **Audit log** | `AuditLog.create({ actorId, action, entity, entityId, detail })` on every admin mutation |

---

## 2. Route catalogue

### 2.1 Public catalog routes

| Method | Route | File | Purpose |
|---|---|---|---|
| GET | `/api/products` | `products/route.ts` | Paginated product list (params: `q`, `category`, `page`, `limit≤100`) |
| GET | `/api/products/[slug]` | `products/[slug]/route.ts` | Single product by slug |
| GET | `/api/categories` | `categories/route.ts` | Departments → categories tree with product counts |
| GET | `/api/catalog` | `catalog/route.ts` | **Returns `application/javascript`** that sets `window.NASSIM_PRODUCTS` |

Notes:
- `/api/catalog` is unusual — it returns a JS file consumed by
  `product-nav.js` and `product view.html`. Uses `Cache-Control: no-store`,
  which forces a re-fetch on every page load.
- All four force-dynamic despite being public reads — no caching.

### 2.2 Auth routes

| Method | Route | File | Auth | Body |
|---|---|---|---|---|
| POST | `/api/auth/register` | `auth/register/route.ts` | none | `{ name, email, password≥8, phone? }` |
| POST | `/api/auth/login` | `auth/login/route.ts` | none | `{ email, password }` |
| POST | `/api/auth/logout` | `auth/logout/route.ts` | none (operates on caller's cookie) | — |
| GET | `/api/auth/me` | `auth/me/route.ts` | user | — |
| PATCH | `/api/auth/me` | `auth/me/route.ts` | user | `{ name?, email?, phone?, password? }` |

- Login normalizes email to lowercase; returns generic 401 on bad credentials
  (no user-enumeration leak).
- Login & register create a `Session` row + signed JWT cookie (30-day expiry).
- `PATCH /api/auth/me` allows changing email with no password re-verification.

### 2.3 Cart & wishlist (user-only)

| Method | Route | File | Behaviour |
|---|---|---|---|
| GET | `/api/cart` | `cart/route.ts` | List user's cart items (include product) |
| POST | `/api/cart` | `cart/route.ts` | Upsert `{ slug, quantity 1-999 }` — **replaces** quantity (does not increment). **No stock check.** |
| DELETE | `/api/cart` | `cart/route.ts` | `?slug=x` removes one; no param clears all |
| GET | `/api/wishlist` | `wishlist/route.ts` | List wishlist items |
| POST | `/api/wishlist` | `wishlist/route.ts` | Add `{ slug }` |
| DELETE | `/api/wishlist` | `wishlist/route.ts` | `?slug=x` removes one; no param clears all |

> ⚠️ The storefront HTML **never calls `/api/cart`** — guests use localStorage.
> Only the wishlist is synced server-side (and only when logged in). The cart
> API is effectively unused by the UI.

### 2.4 Orders

| Method | Route | File | Auth | Behaviour |
|---|---|---|---|---|
| POST | `/api/orders` | `orders/route.ts` | **guest or user** | Validates items; recomputes subtotal from DB prices; **trusts client `shipping` (0-100)**; decrements stock inside txn |
| GET | `/api/orders` | `orders/route.ts` | user | Lists the caller's own orders |

- POST body: `{ customerName, customerEmail, customerPhone≥6, address≥3, city, items[1-100] { slug, name, price, quantity }, shipping 0-100, currency? }`.
- Inside `prisma.$transaction`: stock re-check + decrement per item,
  `order.create` with nested `items` + initial `statusHistory`, then a second
  UPDATE to set the final `orderNumber = AN-<year>-<id padded 6>`.
- Server ignores client-supplied line `price` for the subtotal (good), but
  **trusts client-supplied `shipping`** (integrity gap).

### 2.5 Admin routes (all gated by `requireStaff()`)

| Method | Route | File | Notes |
|---|---|---|---|
| GET | `/api/admin/stats` | `admin/stats/route.ts` | 8 parallel aggregations: counts, revenue (non-cancelled), top products, low-stock, recent orders |
| GET | `/api/admin/orders` | `admin/orders/route.ts` | `?status=` filter; **`take: 200`, no pagination** |
| PATCH | `/api/admin/orders` | `admin/orders/route.ts` | `{ id, status, note? }` — **no state-machine; any transition allowed** |
| GET | `/api/admin/products` | `admin/products/route.ts` | Full list (no pagination) + categories |
| POST | `/api/admin/products` | `admin/products/route.ts` | Create with ~40 fields, colors/sizes, FK connects |
| PATCH | `/api/admin/products` | `admin/products/route.ts` | Partial update; rebuilds colors/sizes |
| DELETE | `/api/admin/products` | `admin/products/route.ts` | **Soft delete** (`isActive=false`) |
| GET | `/api/admin/customers` | `admin/customers/route.ts` | `?q=&role=`; counts of orders/addresses/cart/wishlist; **excludes passwordHash** |
| GET | `/api/admin/customers/[id]` | `admin/customers/[id]/route.ts` | Customer + addresses + orders |
| PATCH | `/api/admin/customers/[id]` | `admin/customers/[id]/route.ts` | `{ isActive }` only; **no Zod** |
| GET/POST/PATCH/DELETE | `/api/admin/hierarchy/[entity]` | `admin/hierarchy/[entity]/route.ts` | `[entity] ∈ {departments, sections, categories, subcategories}` — full CRUD |
| GET/POST/PATCH/DELETE | `/api/admin/master/[entity]` | `admin/master/[entity]/route.ts` | `[entity] ∈ {brands, materials, colors, sizes, suppliers, units, countries, taxes}` — full CRUD via dynamic Prisma delegate |
| POST | `/api/admin/upload` | `admin/upload/route.ts` | Multipart FormData; ≤8 MiB/file; MIME allowlist; writes to `public/uploads/` |

> All admin mutations write an `AuditLog` entry (`HIER_*`, `MASTER_*`,
> `ORDER_STATUS_CHANGE`, `PRODUCT_*`, etc.).

---

## 3. Method-coverage matrix

| Route | GET | POST | PATCH | PUT | DELETE |
|---|:-:|:-:|:-:|:-:|:-:|
| `/api/auth/login` | – | ✅ | – | – | – |
| `/api/auth/logout` | – | ✅ | – | – | – |
| `/api/auth/me` | ✅ | – | ✅ | – | – |
| `/api/auth/register` | – | ✅ | – | – | – |
| `/api/cart` | ✅ | ✅ | – | – | ✅ |
| `/api/catalog` | ✅ | – | – | – | – |
| `/api/categories` | ✅ | – | – | – | – |
| `/api/orders` | ✅ | ✅ | – | – | – |
| `/api/products` | ✅ | – | – | – | – |
| `/api/products/[slug]` | ✅ | – | – | – | – |
| `/api/wishlist` | ✅ | ✅ | – | – | ✅ |
| `/api/admin/customers` | ✅ | – | – | – | – |
| `/api/admin/customers/[id]` | ✅ | – | ✅ | – | – |
| `/api/admin/hierarchy/[entity]` | ✅ | ✅ | ✅ | – | ✅ |
| `/api/admin/master/[entity]` | ✅ | ✅ | ✅ | – | ✅ |
| `/api/admin/orders` | ✅ | – | ✅ | – | – |
| `/api/admin/products` | ✅ | ✅ | ✅ | – | ✅ (soft) |
| `/api/admin/stats` | ✅ | – | – | – | – |
| `/api/admin/upload` | – | ✅ | – | – | – |

**PUT is implemented on zero routes** — PATCH is used consistently for
partial updates. No route exposes HEAD/OPTIONS explicitly (Next defaults).

---

## 4. Response-shape inconsistencies

- Standard envelope: `{ success: boolean, data?, error? }`.
- `POST /api/orders` returns **both** top-level `order` and `data.order`
  (`orders/route.ts:127-146`).
- `GET /api/orders` returns **both** top-level `orders` and `data.orders`
  (`orders/route.ts:183`).
- Error responses are sometimes `{ error }` only, sometimes
  `{ success: false, error }` — no shared helper.

There is **no shared `jsonOk()` / `jsonError()` helper**; every route
hand-writes `NextResponse.json(…)`.

---

## 5. Validation coverage

Zod is used on essentially every mutation endpoint:

- `auth/login`, `auth/register`, `auth/me` PATCH
- `cart` POST, `wishlist` POST
- `orders` POST (the richest schema — items, customer fields, shipping)
- `admin/products` (POST + PATCH with ~30-field `sharedFields`)
- `admin/orders` PATCH
- `admin/hierarchy/[entity]` (per-entity schemas, slug regex `^[a-z0-9-]+$`)
- `admin/master/[entity]` (per-entity schemas via `ENTITY_CONFIG`)

**Missing Zod:**
- `admin/customers/[id]` PATCH — reads `body as { isActive?: boolean }`
  with no schema. Safe today (only `isActive` honoured) but fragile.

---

## 6. File upload detail (`/api/admin/upload`)

- Accepts `multipart/form-data`; iterates `formData()` entries, filters to
  `File` instances.
- Per-file checks: size ≤ 8 MiB, MIME type ∈ `{jpeg,png,webp,gif,avif}`.
- Extension sanitized to the allowlist; filename is synthetic
  (`Date.now()-<rand>.<ext>`) — no path traversal.
- Writes to `public/uploads/` (creates dir if missing).
- Returns `{ success, data: { files: [{ url, filename, size }] } }`.

**Concerns:**
- MIME type is **client-provided** (`file.type`) — no magic-number sniff.
- Stored under `public/` → public read; also **breaks on serverless /
  read-only filesystem** deployments.
- No antivirus, no image re-encoding.

---

## 7. Notable behaviour gaps & bugs

| # | Issue | Location |
|---|---|---|
| 1 | Cart POST does not enforce stock; can add 999 of a 0-stock item | `cart/route.ts:60-64` |
| 2 | Cart POST upsert **replaces** quantity (counter-intuitive for "add to cart") | `cart/route.ts:63` |
| 3 | Orders POST trusts client-supplied `shipping` (0-100 arbitrary) | `orders/route.ts:85` |
| 4 | Orders stock check happens outside the txn — race condition / oversell | `orders/route.ts:59 vs 117-121` |
| 5 | Admin orders PATCH has no state-machine; any status transition allowed | `admin/orders/route.ts:96-103` |
| 6 | Admin orders GET caps at `take: 200`, no pagination — silently truncates | `admin/orders/route.ts:69` |
| 7 | Admin products GET returns every product — no pagination | `admin/products/route.ts` |
| 8 | Admin customers PATCH has no Zod | `admin/customers/[id]/route.ts:102` |
| 9 | Admin hierarchy DELETE classifies "not found" (P2025) as 409 "in use" | `admin/hierarchy/[entity]/route.ts:224-229` |
| 10 | `master/[entity]` uses `as unknown as Record<...>` casts — type-safety hole (functionally safe due to allowlist) | `admin/master/[entity]/route.ts:108-111` |
| 11 | `defaultOrderBy` declared in ENTITY_CONFIG type but never read | `admin/master/[entity]/route.ts:24` |
| 12 | Public catalog routes force-dynamic — no caching, redundant DB hits | `catalog/route.ts:3`, `products/route.ts`, `categories/route.ts` |

---

## 8. Security posture of the API

| Property | Status |
|---|---|
| SQL injection | ✅ None — Prisma parameterized everywhere |
| Secret leakage in responses | ✅ `publicUser()` and explicit `select` strip `passwordHash` |
| Authorization consistency | ✅ All `/admin/*` gated by `requireStaff()` |
| Audit trail | ✅ Every admin mutation logged |
| Rate limiting | ❌ None (login/register brute-force-able) |
| CSRF | ⚠️ `sameSite=lax` only; no token |
| ADMIN/STAFF separation | ❌ Flat — both roles have identical access |
| Middleware-level auth | ❌ No `middleware.ts` |
| File upload content sniffing | ❌ Trusts client MIME |
| Order integrity | ⚠️ Shipping field manipulable; stock race |
| Cookie attributes | ✅ httpOnly, secure-in-prod, sameSite-lax |
