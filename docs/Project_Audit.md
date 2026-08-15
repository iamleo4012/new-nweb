# Project Audit

> Project: **nassim-platform** (`C:\Users\leojo\Downloads\nassim backup\nassim-main`)
> Audit date: 2026-07-21
> Auditor role: Senior Software Architect / Full Stack Engineer / DBA / QA Lead
> Method: read-only inspection. **No code was modified.**

This is the master audit document. It consolidates every concrete finding
from the full-codebase review, with `file:line` references throughout. The
companion documents (`Architecture.md`, `Database_Overview.md`, `API_Overview.md`,
`Current_Status.md`, `Technology_Stack.md`, `Folder_Structure.md`) contain
the structured detail; this document is the at-a-glance reference of
**what is finished, what is broken, and what is missing**.

---

## Table of contents

1. [Project identity](#1-project-identity)
2. [What works end-to-end](#2-what-works-end-to-end)
3. [Security findings](#3-security-findings)
4. [Backend / API findings](#4-backend--api-findings)
5. [Admin panel findings](#5-admin-panel-findings)
6. [Storefront findings](#6-storefront-findings)
7. [Database findings](#7-database-findings)
8. [Dead / duplicate / orphan code](#8-dead--duplicate--orphan-code)
9. [DevOps / testing / observability](#9-devops--testing--observability)
10. [Discrepancies vs. intended design](#10-discrepancies-vs-intended-design)
11. [Consolidated risk register](#11-consolidated-risk-register)
12. [Executive summary](#12-executive-summary)

---

## 1. Project identity

- **Name:** `nassim-platform` (`package.json:2`), version `1.0.0`.
- **Brand:** "AL-NASSIM" / "Al Nassim Golden Group" (`app/layout.tsx:4`,
  `public/index.html:19`).
- **Domain:** B2B/B2C e-commerce for houseware + warehouse equipment
  (Kuwaiti Dinar currency).
- **Type:** Next.js 15 monolith with a static-HTML storefront, a React admin
  SPA, and a PostgreSQL database.
- **Stack:** Next.js 15, React 19, TypeScript 5.7 (strict), Prisma 6,
  PostgreSQL, bcryptjs, jsonwebtoken, zod. Tailwind via CDN.

---

## 2. What works end-to-end

These flows are functional today (verified by code inspection):

1. **Sign up / sign in / sign out** — `account.js` ↔ `/api/auth/*`.
2. **Browse homepage, category pages, product detail** — DB-driven via
   `/api/catalog` injection + static fallback.
3. **Search overlay** — debounced `/api/products` query.
4. **Add to cart / wishlist (localStorage)** — guests included.
5. **Checkout (COD)** — `checkout.js` → `/api/orders` with stock decrement
   and status history.
6. **"My Orders"** — `/api/orders` (own orders).
7. **Admin dashboard** — `/api/admin/stats`.
8. **Admin Master Data CRUD** — 12 entities (departments, sections,
   categories, subcategories, brands, materials, colors, sizes, units,
   suppliers, countries, taxes).
9. **Admin product create + image upload** — drag-drop, gallery, set primary.
10. **Admin order list + status change** — with audit log.
11. **Admin customer list + activate/deactivate** — with order history.
12. **Dark mode toggle** — `dark-overrides.{css,js}`.

---

## 3. Security findings

### 3.1 🔴 Committed secrets (`.env` on disk)

`.env` is present in the working tree (git-ignored, but shipped in this
snapshot):

| Var | Value |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:apple123@localhost:5432/postgres` |
| `JWT_SECRET` | `nassim-prod-secret-c7d1f4a9e2b84f6d9a3c5e8b1f0d7a24` |
| `SESSION_COOKIE_NAME` | `nassim_sid` |
| `ADMIN_SEED_EMAIL` | `admin@alnassim.com` |
| `ADMIN_SEED_PASSWORD` | `Admin@12345` |

The DB password (`apple123`) and admin password (`Admin@12345`) are weak
and default-guessable. The JWT secret's name (`-prod-secret-`) suggests
production use.

**Action required:** rotate all of these; never commit `.env`; use a secret
manager.

### 3.2 🔴 No rate limiting / brute-force protection

- No `middleware.ts` exists. Grep for `rateLimit|brute|throttle|lockout`
  returns nothing.
- `/api/auth/login` (`app/api/auth/login/route.ts`) and
  `/api/auth/register` (`app/api/auth/register/route.ts`) are unlimited.

### 3.3 🟠 No CSRF protection

Cookie auth uses `sameSite=lax` only (`lib/auth.ts:23`). No CSRF token.
State-changing endpoints rely solely on the browser's same-site cookie rule.

### 3.4 🟠 Flat role model — STAFF ≡ ADMIN

`requireStaff()` (`lib/auth.ts:66-70`) admits `ADMIN` **or** `STAFF`.
There is **no `requireAdmin`** anywhere. A STAFF user can:
- soft-delete products (`admin/products` DELETE),
- change any order status (`admin/orders` PATCH),
- deactivate ADMIN users (`admin/customers/[id]` PATCH),
- upload files (`admin/upload`),
- delete hierarchy/master records.

### 3.5 🟠 File upload trusts client MIME

`app/api/admin/upload/route.ts:33` reads `file.type` (client-provided) with
no magic-number sniff. Extension is sanitized, but a non-image could be
uploaded as `image/png`. Files served verbatim from `/uploads/`.

### 3.6 🟠 Order integrity gaps

- `app/api/orders/route.ts:85` — **client-supplied `shipping` (0-100)** is
  trusted; order total can be manipulated.
- `app/api/orders/route.ts:59` vs `117-121` — stock check happens **outside**
  the transaction; concurrent orders can oversell.

### 3.7 🟡 Cart does not enforce stock

`app/api/cart/route.ts:60-64` lets a user add 999 units of a 0-stock item.
Stock is only checked at order time.

### 3.8 ✅ Strengths

- **Zero raw SQL** — no `$queryRaw`/`$executeRaw` anywhere. No SQL-injection
  surface.
- `publicUser()` (`lib/auth.ts:62-64`) and explicit `select` clauses strip
  `passwordHash` from every response.
- Session design is robust: DB `Session` row is source of truth; JWT verified;
  `expiresAt` checked; `user.isActive` re-checked on every request → supports
  server-side revocation.
- Cookie attributes: `httpOnly`, `secure` in production, `sameSite=lax`.
- Security headers in `next.config.mjs`: `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`.

---

## 4. Backend / API findings

See `API_Overview.md` for the full route catalogue. Top findings:

| # | Severity | Finding | Location |
|---|---|---|---|
| B1 | 🟠 | Orders POST trusts client `shipping` | `app/api/orders/route.ts:85` |
| B2 | 🟠 | Stock check/decrement race condition | `app/api/orders/route.ts:59` vs `:117-121` |
| B3 | 🟠 | Admin orders PATCH has no state machine — any transition allowed | `app/api/admin/orders/route.ts:96-103` |
| B4 | 🟡 | Admin orders GET caps at `take: 200`, no pagination | `app/api/admin/orders/route.ts:69` |
| B5 | 🟡 | Admin products GET returns all products, no pagination | `app/api/admin/products/route.ts` |
| B6 | 🟡 | Cart POST does not check stock; upsert replaces qty (counter-intuitive) | `app/api/cart/route.ts:60-64` |
| B7 | 🟡 | `admin/customers/[id]` PATCH has no Zod | `app/api/admin/customers/[id]/route.ts:102` |
| B8 | 🟡 | `admin/hierarchy` DELETE misclassifies "not found" (P2025) as 409 "in use" | `app/api/admin/hierarchy/[entity]/route.ts:224-229` |
| B9 | 🟡 | `admin/master/[entity]` uses `as unknown as Record<...>` casts (functionally safe via allowlist) | `app/api/admin/master/[entity]/route.ts:108-111` |
| B10 | 🟡 | Public catalog/products/categories routes force-dynamic — no caching | `catalog/route.ts:3` & others |
| B11 | 🟡 | Inconsistent response envelope (`/api/orders` returns `order` and `data.order`) | `app/api/orders/route.ts:127-146, 183` |
| B12 | 🟡 | `defaultOrderBy` declared in `ENTITY_CONFIG` type but never read | `app/api/admin/master/[entity]/route.ts:24` |
| B13 | ⚪ | No shared `jsonOk()/jsonError()` helper — every route hand-writes `NextResponse.json` | all routes |
| B14 | ⚪ | Order create writes twice (placeholder `orderNumber`, then real one) | `app/api/orders/route.ts:90, 108` |

**Positive:** audit logging (`AuditLog.create`) is consistent across every
admin mutation. Zod is used on all mutations except B7. No TODO/FIXME markers.

---

## 5. Admin panel findings

See `Current_Status.md` for module status. Top findings:

| # | Severity | Finding | Location |
|---|---|---|---|
| A1 | 🔴 | **No product edit/delete UI** — only create. API supports PATCH/DELETE. | `app/admin/_components/ProductsTab.tsx` (list table has no Actions column) |
| A2 | 🔴 | **No admin login screen** — relies on storefront sign-in | `app/admin/AdminApp.tsx` |
| A3 | 🟠 | Auth gate is **client-side only** (`fetch /api/auth/me`); no server gate at layout | `app/admin/AdminApp.tsx:90-103`, `app/admin/layout.tsx` |
| A4 | 🟠 | Tailwind loaded via **Play CDN** in production layout | `app/admin/layout.tsx:11` |
| A5 | 🟡 | Dead code: `filteredSubcategories` + dev comment "// Let me fix this." | `app/admin/_components/ProductsTab.tsx:167-170` |
| A6 | 🟡 | `"multiselect"` declared in `FieldDef.type` but never rendered | `app/admin/_components/MasterDataPanel.tsx:423` |
| A7 | 🟡 | Subcategory category-dropdown not filtered by parent department/section | `app/admin/_components/MasterDataPanel.tsx:544-556` |
| A8 | 🟡 | All lists paginate/filter client-side over full datasets — won't scale | `MasterDataPanel.tsx:190-196`, `ProductsTab.tsx:163-165`, `CustomersTab.tsx` |
| A9 | 🟡 | Inconsistent status sets: `AdminApp` omits `REFUNDED`, `CustomersTab` includes it | `AdminApp.tsx:51-60` vs `CustomersTab.tsx:46-56` |
| A10 | 🟡 | `fmt()` hardcodes 3-decimal KWD format, no currency awareness | `app/admin/AdminApp.tsx:73` |
| A11 | ⚪ | Customers: no create/edit/role-change/delete (only activate/deactivate) | `CustomersTab.tsx` |
| A12 | ⚪ | Orders: no create/refund/delete (only status change) | `AdminApp.tsx` OrdersTab |
| A13 | ⚪ | 4 admin route pages are 7-line wrappers; navigation is tab-state, not URL | `app/admin/{customers,master-data,orders,products}/page.tsx` |

**Positive:** clean component structure, Master Data and Hierarchy modules
are genuinely complete CRUD, image upload + media library is well-built.

---

## 6. Storefront findings

### 6.1 Architectural

| # | Severity | Finding |
|---|---|---|
| S1 | 🔴 | **No Arabic / RTL** — every page `<html lang="en">`; `EN\|AR` toggle is decorative (no handler). `AGENTS.md` mandates RTL. |
| S2 | 🔴 | **No SEO** — zero `og:`, `twitter:`, JSON-LD, `<meta description>`, `sitemap.xml`, `robots.txt`. Product content is JS-rendered (invisible to crawlers). |
| S3 | 🔴 | **No payment gateway** — Cash on Delivery only (`app/api/orders/route.ts:104`). |
| S4 | 🟠 | Tailwind Play CDN hotlinked on every page — runtime JIT compile; production-discouraged. |
| S5 | 🟠 | **Three product catalogs** that drift: DB (`/api/catalog`), `public/assets/js/products.js` (static fallback), inline arrays in `forklift.html`/`rack.html`/`trolly.html`. |
| S6 | 🟠 | Server cart API exists but **storefront never calls it** — cart is localStorage-only for everyone. |
| S7 | 🟡 | Header/footer copy-pasted into every HTML file (no include) — drifts between pages. |

### 6.2 Functional bugs

| # | Severity | Finding | Location |
|---|---|---|---|
| S8 | 🟠 | Cart page ships with **two dummy items** (Google stock images); only overwritten if localStorage has items | `public/cart.html:95-120, 236-240` |
| S9 | 🟠 | "Wishlist" button on cart rows only toggles icon color — does not move item to wishlist | `public/cart.html:281-287` |
| S10 | 🟠 | Color and unit filters on category pages have **no JS handler** — dead UI | `public/kitchenware.html:398-406, 684-685` |
| S11 | 🟠 | Category fallback leaks products from other categories (shows first 12 of entire catalog when none match) | `public/kitchenware.html:627-629` |
| S12 | 🟡 | Logo link on homepage → `code.html` (absent), bounces through redirect | `public/index.html:420` |
| S13 | 🟡 | `product view.html` uses `document.write` for catalog fallback — fragile | `public/product view.html:171` |
| S14 | 🟡 | `product view.html` filename has a literal space → `product%20view.html` | `public/product view.html` |
| S15 | 🟡 | Cart badge not updated on home/category pages (stays `00`) | `cart-nav.js` coverage |
| S16 | ⚪ | `advertisment.html` brand is "Atelier Nord / Curated Manor"; `cool.html` is "Arctic Precision"; `cold.html` is "Arctic Bespoke" — template-brand leakage | `public/{advertisment,cool,cold}.html` |

### 6.3 Placeholder / dummy data

- Google-hosted stock images (`lh3.googleusercontent.com/aida-public/...`) on
  18+ pages including **default cart contents**.
- ChatGPT-generated asset shipped under its literal filename:
  `public/topcar/products_houseware/ChatGPT Image Apr 6, 2026, 04_53_48 PM.png`.
- Mega-menu items "Customized Packaging" and "Cold Rooms" and their sub-items
  are all `href="#"` on every page.
- Footer columns 2-4 ("Help", "About", "FAQ", "Returns") are all `href="#"`.
- Homepage "Explore Selection" bento CTAs are `href="#"`.

---

## 7. Database findings

See `Database_Overview.md` for the full entity map. Top findings:

| # | Severity | Finding | Location |
|---|---|---|---|
| D1 | 🔴 | **Seed bug**: `INQUIRY_CATEGORIES` slug set never matches display-name category values → all categories land in `houseware`; `warehouse` dept empty | `prisma/seed.mjs:18, 39, 42` |
| D2 | 🟠 | `Category.slug` ends up containing spaces/`&` (e.g. `"Trolleys & Baskets"`) — not URL-safe, used as unique key | consequence of D1 |
| D3 | 🟠 | Seed product `upsert` **overwrites** admin edits on re-run | `prisma/seed.mjs:64` |
| D4 | 🟡 | `StockMovement` table defined + indexed but **never written** by any code | `prisma/schema.prisma:176-188` |
| D5 | 🟡 | `Address` model has **no API** to create/update/delete — admin reads, storefront ignores | `prisma/schema.prisma:190-203` |
| D6 | 🟡 | `Section` / `Subcategory` — schema + admin CRUD exist but seed doesn't populate, storefront ignores | schema + `MasterDataPanel` |
| D7 | 🟡 | `Setting` table — only 2 keys; order placement ignores `shipping_fee` (hardcodes 2.5) | `app/api/orders/route.ts:85`, `prisma/seed.mjs:83-84` |
| D8 | 🟡 | `OrderStatusEvent` written on every status change but **read by no UI** | `app/api/admin/orders/route.ts` |
| D9 | 🟡 | `ProductImage` admin-written but storefront reads `Product.image`/`images` instead — three overlapping image stores | `prisma/schema.prisma:215-216, 165-174` |
| D10 | 🟡 | `REFUNDED` enum value exists; no UI button to set it | `schema.prisma:30`, `AdminApp.tsx:51-60` |
| D11 | ⚪ | `Address.isDefault` has no constraint enforcing single default per user | `schema.prisma:200` |
| D12 | ⚪ | Missing indexes: `Product.sku`, `Order.createdAt`, GIN on `Product.tags` | `schema.prisma` |

**Positive:** migrations are additive, in sync with schema, all FKs have
explicit `ON DELETE`, no destructive changes.

---

## 8. Dead / duplicate / orphan code

| Item | Location | Disposition |
|---|---|---|
| `rackingpage/` (Vite prototype, ~10 components) | repo root | Orphan — not imported by main app |
| `code backup/` (3 large HTML + `1/`) | repo root | Legacy snapshots — excluded from tsconfig |
| `home.html` (near-dup of `index.html`) | `public/` | Redirected away but still shipped |
| `carousel_js.txt` | `public/` | Orphan snippet — selectors match nothing |
| `filteredSubcategories` + "// Let me fix this." | `ProductsTab.tsx:167-170` | Dead code from incomplete refactor |
| `"multiselect"` field type | `MasterDataPanel.tsx:423` | Declared, never rendered |
| `defaultOrderBy` config field | `admin/master/[entity]/route.ts:24` | Declared, never read |
| 2 truncated PNG files | `public/uploads/` | Corrupted/empty uploads |
| `ChatGPT Image … .png` | `public/topcar/products_houseware/` | Generated-asset filename shipped |
| Template-brand text | `advertisment.html`, `cool.html`, `cold.html` | "Atelier Nord"/"Arctic Precision"/"Arctic Bespoke" not replaced |
| `code.html`, `code_temp.html`, `dummy12.html`, `house_temp.html` | redirects only | Targets absent |
| `href="#"` mega-menu/footer links | every page | Dead navigation |
| Inline product arrays | `forklift.html`, `rack.html`, `trolly.html` | Siloed catalogs drifting from DB |

---

## 9. DevOps / testing / observability

| Area | Status |
|---|---|
| Test framework | 🔴 None. Zero tests. No `test` script. |
| Lint / format | 🔴 No ESLint, no Prettier config. |
| CI / CD | 🔴 None. |
| Logging | 🔴 `console.error` only. No structured logger. |
| Error tracking | 🔴 None (no Sentry, etc.). |
| Analytics | 🔴 None. |
| Backups | 🔴 Not addressed. |
| Deployment docs | 🔴 None. |
| Type checking | ✅ `npm run typecheck` (`tsc --noEmit`); strict mode on. |

---

## 10. Discrepancies vs. intended design

`AGENTS.md.txt` describes a desired stack and conventions that the code does
**not** follow:

| Intended | Actual |
|---|---|
| Supabase Storage | Local `public/uploads/` |
| Tailwind via build | Tailwind via Play CDN |
| `components/`, `hooks/`, `services/`, `types/` dirs | None exist (admin components under `app/admin/_components/`) |
| Arabic RTL compatibility | None |
| "Reusable components" | Header/footer copy-pasted per HTML page |
| "Avoid duplicate code" | Three product catalogs; status sets defined twice |
| "Keep ESLint clean" | No ESLint configured |
| "Use Playwright to verify flows" | No Playwright in main app |
| "Production-quality suitable for deployment" | Not yet — see risk register |

The `AGENTS.md.txt` file should either be made true or corrected.

---

## 11. Consolidated risk register

| # | Risk | Severity | Likelihood | Area |
|---|---|---|---|---|
| R1 | Committed secrets (DB pw, JWT, admin pw) | 🔴 Critical | Confirmed | Security |
| R2 | No brute-force protection on auth | 🔴 Critical | Confirmed | Security |
| R3 | STAFF has full admin powers | 🟠 High | Confirmed | Security |
| R4 | Order total manipulation via `shipping` | 🟠 High | Confirmed | Integrity |
| R5 | Oversell via stock race | 🟠 High | Confirmed | Integrity |
| R6 | Tailwind CDN outage → unstyled site | 🟠 High | External | Availability |
| R7 | Uploads lost on redeploy / break on serverless | 🟠 High | Architectural | Operations |
| R8 | No admin login screen; client-only gate | 🟠 High | Confirmed | Admin UX |
| R9 | No product edit/delete UI | 🟠 High | Confirmed | Admin function |
| R10 | Seed overwrites admin edits | 🟡 Medium | On re-seed | Data |
| R11 | Seed dept-routing bug (D1) | 🟡 Medium | Confirmed | Data |
| R12 | No tests | 🟡 Medium | Confirmed | Quality |
| R13 | No CSRF token | 🟡 Medium | Confirmed | Security |
| R14 | File-upload MIME spoofing | 🟡 Medium | Confirmed | Security |
| R15 | No SEO / sitemap | 🟡 Medium | Confirmed | Growth |
| R16 | No Arabic / RTL | 🟡 Medium | Confirmed | Market |
| R17 | No payment gateway | 🟡 Medium | Confirmed | Commerce |
| R18 | Category-filter dead UI / cross-category leak | 🟡 Medium | Confirmed | Storefront |
| R19 | Dummy default cart contents | 🟡 Low | Confirmed | Storefront |
| R20 | Inconsistent status enum surfaces | 🟢 Low | Confirmed | Polish |

---

## 12. Executive summary

**What this is:** a Next.js 15 + React 19 + Prisma 6 + PostgreSQL monolith
for a Kuwaiti houseware/warehouse e-commerce brand ("AL-NASSIM"). It pairs a
**static-HTML storefront** (hand-written pages in `public/`, decorated by
vanilla JS that calls the API) with a **React admin SPA** and a
**well-modelled PostgreSQL backend** (20 models, 2 additive migrations, full
audit logging).

**Stage:** Late MVP for the backend/admin; prototype for the storefront.
Phase 1 (core e-commerce) and Phase 2 (ERP master data) are committed and
coherent. Phase 3 (payments, Arabic/RTL, React storefront, hardening,
testing) has not started.

**Strengths**
- Clean, type-safe, well-structured code; strict TypeScript; minimal
  dependency footprint.
- Robust session design (DB + JWT, revocation supported).
- Comprehensive, consistent API with Zod validation, parameterized queries
  (no SQL injection), and audit logging on every admin mutation.
- Master-data and hierarchy admin modules are genuinely complete CRUD.
- Database schema is ahead of the application — extensive ERP-style master
  data already modelled and indexed.

**Critical issues**
- Secrets committed in `.env`; no rate limiting; flat STAFF/ADMIN role
  model; client-only admin auth gate.
- Order integrity: trusted client `shipping` field and a stock-check race.
- Admin cannot edit or delete products from the UI (API supports it).
- Storefront has no Arabic/RTL (mandated by `AGENTS.md`), no SEO, no payment
  gateway, dead filter UI, dummy default cart, template-brand leakage, and
  three drifting product catalogs.
- Tailwind is loaded from a public CDN at runtime in both admin and
  storefront — production-blocker.
- Zero automated tests; no CI; no logging beyond `console.error`.

**Completion estimates**
- Database: ~90%
- Backend / API: ~80%
- Admin panel: ~55%
- Storefront: ~45%
- **Overall: ~55–60%**

**Recommendation:** the project is a credible vertical slice (browse → cart
→ checkout → order → admin) but is **not production-ready**. Before launch,
prioritize (1) secret rotation, (2) rate limiting + CSRF + `requireAdmin`,
(3) order integrity fixes, (4) admin product edit/delete + login screen,
(5) a storefront strategy decision (finish static vs. rebuild in React),
(6) payment + Arabic/RTL + SEO, and (7) install Tailwind properly + add
tests. With those, the platform could reach production; without them, it
remains a promising internal prototype.
