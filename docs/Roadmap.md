# Development Roadmap

> Project: **nassim-platform** (AL-NASSIM)
> Generated: 2026-07-21
> Source basis: `Project_Audit.md`, `Architecture.md`, `Current_Status.md`,
> `Technology_Stack.md`, `Database_Overview.md`, `Database_Audit.md`,
> `API_Overview.md`, `Folder_Structure.md`, `Feature_Matrix.md`, `UI_Audit.md`
> Goal: a sequenced plan to take the platform from its current MVP state to a
> **production deployment**.

This roadmap consolidates every finding from the audit suite into a single
prioritized backlog, ordered for production launch. Each item carries a
severity, an effort estimate (in engineer-days, "d"), dependencies, and the
milestone it belongs to.

---

## Table of contents

1. [Current project completion](#1-current-project-completion)
2. [Critical blockers (launch-gates)](#2-critical-blockers-launch-gates)
3. [High-priority tasks](#3-high-priority-tasks)
4. [Medium-priority tasks](#4-medium-priority-tasks)
5. [Low-priority tasks](#5-low-priority-tasks)
6. [Technical debt register](#6-technical-debt-register)
7. [Missing features](#7-missing-features)
8. [Recommended implementation order](#8-recommended-implementation-order)
9. [Effort summary](#9-effort-summary)
10. [Milestones](#10-milestones)
11. [Out of scope / explicit non-goals](#11-out-of-scope--explicit-non-goals)
12. [How to read this roadmap](#12-how-to-read-this-roadmap)

---

## 1. Current project completion

Aggregated from `Current_Status.md` and `Feature_Matrix.md`, weighted for
production-readiness (a feature that works locally but ships via CDN, lacks
tests, or has no auth hardening is not 100%).

| Layer | Completion | Trend |
|---|---:|---|
| Database / schema | **90%** | Solid; needs data cleanup + CHECK constraints |
| Backend / API | **80%** | Functional; needs hardening + integrity fixes |
| Admin panel | **55%** | Master data complete; missing product edit/delete + login |
| Storefront (user website) | **45%** | Desktop polished; mobile nav broken; SEO/i18n missing |
| Security & DevOps | **25%** | Secrets, rate-limiting, tests, CI all missing |
| **Overall** | **~55–60%** | Vertical slice works end-to-end |

```
Database        ████████████████████░  90%
Backend / API   ████████████████░░░░░  80%
Admin panel     ███████████░░░░░░░░░░  55%
Storefront      █████████░░░░░░░░░░░░  45%
Security/DevOps █████░░░░░░░░░░░░░░░░  25%
                                      ─────
Overall                               ~55–60%
```

**Distance to launch:** roughly **40–45 percentage points** of
production-hardening work, concentrated in security, mobile, i18n, SEO,
payments, and testing. The foundation is sound enough to build on.

---

## 2. Critical blockers (launch-gates)

These **must** be fixed before any production deployment. Each maps to a
confirmed finding in the audit suite.

| ID | Blocker | Source | Effort |
|---|---|---|---:|
| **B1** | **Rotate committed secrets** — `.env` ships with `JWT_SECRET`, DB password (`apple123`), admin password (`Admin@12345`), all weak and plaintext on disk | `Project_Audit.md §3.1` | 0.5 d |
| **B2** | **Add rate limiting** on `/api/auth/login` and `/api/auth/register` (no brute-force protection exists; no `middleware.ts`) | `Project_Audit.md §3.2`, `API_Overview.md §8` | 2 d |
| **B3** | **Fix order integrity** — server-trust `shipping` field (client can submit 0–100 arbitrary) and stock check sits outside the transaction (race / oversell) | `API_Overview.md §7 B1/B2`, `Database_Audit.md §15.6` | 2 d |
| **B4** | **Add CSRF protection** — cookie auth relies solely on `sameSite=lax`; no token mechanism | `Project_Audit.md §3.3` | 1.5 d |
| **B5** | **Separate ADMIN from STAFF** — `requireStaff()` collapses both roles; STAFF can deactivate admins, soft-delete products, change any order status | `Project_Audit.md §3.4`, `Architecture.md §4` | 1.5 d |
| **B6** | **Migrate uploads off local filesystem** — `public/uploads/` breaks on serverless/read-only hosts and is lost on redeploy; `AGENTS.md.txt` specifies Supabase Storage | `Project_Audit.md §3.5`, `Technology_Stack.md §9` | 3 d |
| **B7** | **Fix `Category.slug` data** — all 11 live slugs contain spaces/`&` (`"Trolleys & Baskets"`); violates the `^[a-z0-9-]+$` contract used by the storefront and Zod validators | `Database_Audit.md §3.3 §16`, `Database_Overview.md §5` | 1 d |
| **B8** | **Fix seed department routing** — `INQUIRY_CATEGORIES` slug set never matches display-name values, so all 11 categories land in `houseware`; `warehouse` (INQUIRY) department is empty | `Database_Overview.md §5`, `Database_Audit.md §3.3` | 0.5 d |
| **B9** | **Add mobile hamburger menu** — mega-menu doesn't collapse; only 8 of 31 nav items visible at 390px; categories unreachable on phones | `UI_Audit.md §6.1 (C1)` | 2 d |
| **B10** | **Remove dummy cart contents** — `cart.html` ships hardcoded "Hand-Forged Damascus Knife KD 65" + "Artisan Steel Fork Set" with Google stock images on first visit | `UI_Audit.md §4.3 (C4)` | 0.5 d |
| **B11** | **Fix template-brand leakage** — `cool.html` ("Arctic Precision"), `cold.html` ("Arctic Bespoke"), `advertisment.html` ("Atelier Nord") still carry wrong brand | `UI_Audit.md §4.8 (C5)` | 0.5 d |
| **B12** | **Add dedicated DB role + database** — app connects as `postgres` superuser to the `postgres` maintenance DB | `Database_Audit.md §15.1` | 1 d |

**Critical-blocker subtotal: ~16 engineer-days.**

---

## 3. High-priority tasks

Required for a credible production launch but not strict security/data
blockers. Grouped by theme.

### 3.1 Admin gaps
| ID | Task | Source | Effort |
|---|---|---|---:|
| **H-A1** | Build **product edit + delete UI** — API supports PATCH/DELETE (`app/api/admin/products`) but the admin has no edit/delete buttons. Today catalog corrections require DB access. | `Project_Audit.md §5 A1`, `Feature_Matrix.md §6.4` | 3 d |
| **H-A2** | Build a **dedicated admin login screen** — currently relies on storefront sign-in; gate is client-side only | `Project_Audit.md §5 A2/A3`, `UI_Audit.md §14.6` | 2 d |
| **H-A3** | Add **server-side admin auth gate** via `middleware.ts` (currently per-route `requireStaff()` only) | `Architecture.md §4`, `API_Overview.md §8` | 1.5 d |
| **H-A4** | Add **pagination** to admin product/order/customer lists (currently `take: 200` or full-table) | `API_Overview.md §7 B4/B5` | 2 d |
| **H-A5** | Add **order state machine** — currently any status transition is allowed (e.g. `DELIVERED → CANCELLED`) | `API_Overview.md §7 B3` | 1.5 d |
| **H-A6** | Surface **`REFUNDED` status** in the UI (enum value exists, no button) | `UI_Audit.md §14.3 (L1)` | 0.5 d |
| **H-A7** | Build **AuditLog viewer** — table is written on every mutation but read by no UI | `Feature_Matrix.md §6.10`, `Database_Audit.md §3.20` | 2 d |

### 3.2 Storefront hardening
| ID | Task | Source | Effort |
|---|---|---|---:|
| **H-S1** | **Wire `href="#"` dead links** — 33 of 49 homepage links point to `#` (footer columns, mega-menu "Customized Packaging"/"Cold Rooms", "Explore Selection" CTAs) | `UI_Audit.md §7.2 (H1)` | 1.5 d |
| **H-S2** | **Wire server cart API** — `/api/cart` exists but storefront uses localStorage only; logged-in users expect cross-device cart | `Feature_Matrix.md §3.2`, `API_Overview.md §2.3` | 2 d |
| **H-S3** | **Wire colour/unit filter checkboxes** — UI present on category pages but no JS handler | `UI_Audit.md §4.2 (H6)`, `Feature_Matrix.md §7.3` | 1 d |
| **H-S4** | **Reconcile triple image storage** — `Product.image`, `Product.images[]`, and `ProductImage` table all coexist; storefront reads first two, admin writes third. Pick one canonical store | `Database_Audit.md §11.1`, `Project_Audit.md §7 D9` | 2 d |
| **H-S5** | **Migrate siloed catalog pages** — `forklift.html`/`rack.html`/`trolly.html` use inline arrays that drift from the DB | `UI_Audit.md §4.7`, `Architecture.md §8` | 2 d |
| **H-S6** | **Install Tailwind via build** (replace Play CDN) — console warning on every page; runtime CSS compilation; external dependency | `Technology_Stack.md §6`, `UI_Audit.md §8.1 (H2)` | 1.5 d |
| **H-S7** | **Fix cart "wishlist" button** — only toggles icon, does not move item to wishlist | `UI_Audit.md §4.3 (M2)` | 0.5 d |
| **H-S8** | **Sync cart badge globally** — currently only updates on `cart.html`/PDP; stays `00` elsewhere | `UI_Audit.md §4 (M1)` | 0.5 d |

### 3.3 Payments & i18n (market requirements)
| ID | Task | Source | Effort |
|---|---|---|---:|
| **H-P1** | **Integrate a payment gateway** — Cash on Delivery only today; no Stripe/KNET/Tap wiring. Required for online revenue | `Feature_Matrix.md §4.8`, `UI_Audit.md §4.4` | 8 d |
| **H-P2** | **Implement Arabic / RTL** — `<html lang="en" dir="">`; `EN\|AR` toggle is decorative; mandated by `AGENTS.md.txt` and required for Kuwait market | `UI_Audit.md §11 (C2)`, `Feature_Matrix.md §8.1` | 10 d |
| **H-P3** | **Add i18n framework** (next-intl or react-i18next) + EN/AR string extraction | `Feature_Matrix.md §8.2`, `Technology_Stack.md §11` | 3 d |

### 3.4 SEO
| ID | Task | Source | Effort |
|---|---|---|---:|
| **H-SE1** | **Per-page meta tags** — homepage title is "AL-NASSIM" (9 chars); no meta description anywhere | `UI_Audit.md §15 (C3)` | 2 d |
| **H-SE2** | **OpenGraph + Twitter cards** | `UI_Audit.md §15`, `Feature_Matrix.md §9.2` | 1 d |
| **H-SE3** | **`sitemap.xml` + `robots.txt`** | `UI_Audit.md §15`, `Feature_Matrix.md §9.3` | 1 d |
| **H-SE4** | **JSON-LD structured data** for Product/Organization | `Feature_Matrix.md §9.4` | 1.5 d |
| **H-SE5** | **Server-render product content** — currently JS-rendered (`window.NASSIM_PRODUCTS`), invisible to crawlers | `Architecture.md §8`, `UI_Audit.md §15` | 3 d |

### 3.5 Database integrity
| ID | Task | Source | Effort |
|---|---|---|---:|
| **H-D1** | **Add CHECK constraints** — zero today; prices/stocks/totals/rates are DB-legal negative | `Database_Audit.md §5 §15.7` | 1 d |
| **H-D2** | **Add file-upload content sniffing** — MIME is client-trusted; no magic-number check | `Project_Audit.md §3.5`, `API_Overview.md §6` | 1 d |
| **H-D3** | **Make AuditLog immutable** — revoke UPDATE/DELETE from the app role | `Database_Audit.md §15.5` | 0.5 d |

**High-priority subtotal: ~58 engineer-days.**

---

## 4. Medium-priority tasks

Quality, scalability, and completeness work that should follow launch or
run in parallel where dependencies allow.

### 4.1 Performance
| ID | Task | Source | Effort |
|---|---|---|---:|
| **M-PER1** | Cache public catalog endpoints (`/api/catalog`, `/api/products`, `/api/categories`) — currently `force-dynamic` + `no-store` | `API_Overview.md §7 B10`, `Database_Audit.md §13.2` | 1.5 d |
| **M-PER2** | Add **GIN indexes** on `Product.tags` and `Product.specs` | `Database_Audit.md §9` | 0.5 d |
| **M-PER3** | Add **trigram/full-text index** for ILIKE search (leading-wildcard queries can't use btree) | `Database_Audit.md §13.4` | 1 d |
| **M-PER4** | Add **composite indexes** (`Product(isActive, categoryId)`, `Order(userId, createdAt)`) | `Database_Audit.md §9` | 0.5 d |
| **M-PER5** | Adopt `next/image` for responsive/WebP images (38 unoptimised PNGs on homepage) | `UI_Audit.md §12`, `Technology_Stack.md §11` | 2 d |
| **M-PER6** | Add **expired-session pruning** job (Session table grows unbounded) | `Database_Audit.md §13.6` | 0.5 d |

### 4.2 Customer account
| ID | Task | Source | Effort |
|---|---|---|---:|
| **M-C1** | Build **saved-addresses CRUD** — `Address` model exists, no API, no UI | `Feature_Matrix.md §5.2`, `Database_Audit.md §3.14` | 2 d |
| **M-C2** | Implement **password reset / forgot password** flow (needs transactional email) | `Feature_Matrix.md §1.8` | 3 d |
| **M-C3** | Implement **email verification** on signup | `Feature_Matrix.md §1.9` | 2 d |
| **M-C4** | Add **order detail view + reorder** in customer account | `Feature_Matrix.md §4.4 §5.3` | 2 d |

### 4.3 Admin completeness
| ID | Task | Source | Effort |
|---|---|---|---:|
| **M-A1** | **Customer create/edit/role-change** — currently only activate/deactivate | `Feature_Matrix.md §5.5 §6.6` | 2 d |
| **M-A2** | **Settings management UI** — `Setting` table exists but no admin UI; checkout ignores `shipping_fee` | `Feature_Matrix.md §6.11`, `Database_Audit.md §3.19` | 1.5 d |
| **M-A3** | **Stock-adjustment UI** that writes `StockMovement` rows (table is unused) | `Feature_Matrix.md §2.13`, `Database_Audit.md §3.11` | 2 d |
| **M-A4** | **Order timeline UI** reading `OrderStatusEvent` (written but unread) | `Feature_Matrix.md §4.5`, `Database_Audit.md §3.18` | 1 d |

### 4.4 Storefront polish
| ID | Task | Source | Effort |
|---|---|---|---:|
| **M-S1** | Add **mini-cart drawer** (slide-out cart from any page) | `Feature_Matrix.md §3.9` | 2 d |
| **M-S2** | Add **favicon** (currently 404) | `UI_Audit.md §8.3 (M3)` | 0.25 d |
| **M-S3** | Add **faceted filtering** (brand, material, tag) with a real endpoint | `Feature_Matrix.md §7.4` | 3 d |
| **M-S4** | **Remove orphan pages** or wire them into navigation (`microfiber.html`, `advertisment.html`, `cool.html`, `cold.html`, `house.html`) | `UI_Audit.md §7.3 (H5)` | 0.5 d |
| **M-S5** | **Fix logo redirect** — `/code.html` → 308 → `/index.html`; pointless bounce | `UI_Audit.md §7.4 (H4)` | 0.1 d |
| **M-S6** | **Rename PDP** — `product view.html` has a literal space; should be `/product/[slug]` route | `UI_Audit.md §7.5 (M7)` | 1 d |

### 4.5 Engineering quality
| ID | Task | Source | Effort |
|---|---|---|---:|
| **M-E1** | **Configure ESLint + Prettier** — `AGENTS.md.txt` mandates "Keep ESLint clean" but no config exists | `Feature_Matrix.md §13.2`, `Current_Status.md §9` | 1 d |
| **M-E2** | **Add API route tests** (Jest/Vitest) covering auth, cart, orders, admin gating | `Feature_Matrix.md §13.3`, `Current_Status.md §9` | 5 d |
| **M-E3** | **Add Playwright E2E tests** for browse → cart → checkout → order flow | `Feature_Matrix.md §13.4` | 4 d |
| **M-E4** | **Set up CI** (GitHub Actions: typecheck + lint + test + prisma migrate check) | `Feature_Matrix.md §13.5` | 1.5 d |

### 4.6 Observability
| ID | Task | Source | Effort |
|---|---|---|---:|
| **M-O1** | **Structured logging** (pino/winston) — currently `console.error` only | `Feature_Matrix.md §12.1`, `Architecture.md §9` | 1.5 d |
| **M-O2** | **Error tracking** (Sentry) | `Feature_Matrix.md §12.2` | 1 d |
| **M-O3** | **Transactional email** (order confirmations, status updates) — required by M-C2/M-C3 | `Feature_Matrix.md §12.4` | 3 d |

**Medium-priority subtotal: ~55 engineer-days.**

---

## 5. Low-priority tasks

Polish, optimisation, and forward-looking improvements. Schedule after
launch or as filler between milestones.

| ID | Task | Source | Effort |
|---|---|---|---:|
| **L1** | Multi-currency support (DB column exists, unused) | `Feature_Matrix.md §8.3` | 3 d |
| **L2** | Product recommendations endpoint (currently client-side) | `Feature_Matrix.md §2.6` | 2 d |
| **L3** | Loyalty / wallet features in customer account | `Feature_Matrix.md §5.1` | 5 d |
| **L4** | Analytics integration (GA / PostHog / Vercel) | `Feature_Matrix.md §12.3` | 1.5 d |
| **L5** | GDPR self-service account deletion / data export | `Feature_Matrix.md §5.4` | 2 d |
| **L6** | Consolidate / delete `rackingpage/` prototype and `code backup/` | `Project_Audit.md §8`, `Folder_Structure.md §6` | 0.5 d |
| **L7** | Reconcile `AGENTS.md.txt` with actual stack (or update it) | `Technology_Stack.md §1`, `Folder_Structure.md §7` | 0.5 d |
| **L8** | Remove dead code (`filteredSubcategories`, `multiselect` field type, `defaultOrderBy`, `carousel_js.txt`, `home.html` duplicate) | `Project_Audit.md §8` | 1 d |
| **L9** | Add partial unique index for `Address.isDefault` (single default per user) | `Database_Audit.md §12.3` | 0.25 d |
| **L10** | Add bcrypt cost-factor helper (currently duplicated in 3 places) and bump to cost 12 | `Database_Audit.md §15.4`, `API_Overview.md §1` | 0.5 d |
| **L11** | Add security headers (CSP, HSTS, Permissions-Policy) | `API_Overview.md §8`, `Feature_Matrix.md §11.4` | 1 d |
| **L12** | Add database backup strategy + docs | `Current_Status.md §9` | 1 d |
| **L13** | Replace `document.write` catalog fallback on PDP with a robust loader | `UI_Audit.md §4.6 (M6)` | 0.5 d |
| **L14** | Persist dark-mode preference reliably in localStorage | `UI_Audit.md §10` | 0.5 d |

**Low-priority subtotal: ~20 engineer-days.**

---

## 6. Technical debt register

Items the team is carrying that should be paid down — not new features, but
liabilities against future velocity.

| ID | Debt item | Impact | Source | Effort |
|---|---|---|---|---:|
| **TD1** | **Tailwind via Play CDN** in both admin and storefront | Production-blocker; runtime CSS compile; external dependency | `Technology_Stack.md §6` | (in H-S6) |
| **TD2** | **No `middleware.ts`** — every API route self-gates; easy to forget authz on a new route | Security fragility | `Architecture.md §4` | (in H-A3) |
| **TD3** | **No shared response/validation helpers** — every route hand-writes `NextResponse.json` + inline Zod | Inconsistency; maintenance burden | `API_Overview.md §4 §13` | 2 d |
| **TD4** | **`as unknown as Record<...>` casts** in `admin/master/[entity]` route | Type-safety hole (functionally safe via allowlist) | `API_Overview.md §7 B9` | 1 d |
| **TD5** | **Schema ahead of code** — `StockMovement`, `Address`, `ProductImage`, `Section`, `Subcategory`, `CartItem` defined but unwritten or unread | ~30% of schema is dead capacity | `Database_Audit.md §8` | (in M-A3, M-C1, H-S2, H-S4) |
| **TD6** | **Seed overwrites admin edits** on re-run (`prisma/seed.mjs:64` upserts products with full overwrite) | Data-loss footgun | `Database_Overview.md §5`, `Database_Audit.md §14` | 0.5 d |
| **TD7** | **No down migrations** — Prisma forward-only; no tested rollback path | Recovery risk | `Database_Audit.md §14.2` | 2 d |
| **TD8** | **Copy-pasted header/footer** across 24 HTML files (no include) | Drift between pages | `Architecture.md §7`, `UI_Audit.md §4` | (in M-S6 / future React storefront) |
| **TD9** | **Three product catalogs** that drift (DB, `products.js`, inline HTML arrays) | Data integrity | `Architecture.md §8`, `UI_Audit.md §4.7` | (in H-S5) |
| **TD10** | **`tsconfig.tsbuildinfo` committed** (~108 KB); pre-rule artifact | Repo hygiene | `Folder_Structure.md §8` | 0.1 d |
| **TD11** | **`OrderStatus`/`StockStatus` enum values are immutable** — PG limitation; adding is fine, removal needs enum rebuild | Future-flexibility risk | `Database_Audit.md §14.3` | (document only) |
| **TD12** | **Two corrupted PNGs in `public/uploads/`** | Repo hygiene | `Project_Audit.md §8` | 0.1 d |

**Technical-debt subtotal (net-new effort): ~8 engineer-days** (most is
covered by tasks already listed above).

---

## 7. Missing features

Features that the audit identified as entirely absent (not partial).
Sequenced by their dependency position in the roadmap.

### 7.1 Launch-critical missing features
- **Online payment gateway** (H-P1) — COD only today.
- **Arabic / RTL + i18n** (H-P2, H-P3) — mandated by `AGENTS.md.txt`.
- **Mobile navigation** (B9) — hamburger menu.
- **SEO foundation** (H-SE1 through H-SE5) — meta tags, sitemap, structured data.
- **Rate limiting + CSRF** (B2, B4).
- **Cloud storage for uploads** (B6).

### 7.2 Post-launch missing features
- **Password reset / email verification** (M-C2, M-C3) — needs transactional email (M-O3).
- **Saved addresses** (M-C1) — schema ready, no API/UI.
- **Order timeline / reorder** (M-C4, M-A4).
- **Stock adjustment + movements** (M-A3).
- **Audit log viewer** (H-A7).
- **Faceted filtering** (M-S3).
- **Loyalty / wallet / GDPR export** (L3, L5).
- **Analytics** (L4).

### 7.3 Infrastructure missing
- **Tests** (M-E2, M-E3) — zero today.
- **CI/CD** (M-E4).
- **Structured logging + error tracking** (M-O1, M-O2).
- **Database backup strategy** (L12).

---

## 8. Recommended implementation order

The order below minimises rework and respects dependencies. Each milestone
builds on the previous; do not skip ahead.

### Phase 0 — Stabilise (before any new feature work)
**Goal:** stop the bleeding. Make the codebase safe to build on.
1. **B1** Rotate secrets → **B12** dedicated DB role + database
2. **TD10, TD12, L7** Repo hygiene (remove committed build cache, corrupted PNGs, reconcile `AGENTS.md.txt`)
3. **B7** Slug cleanup → **B8** Seed routing fix → **TD6** Seed idempotency
4. **B10** Remove dummy cart → **B11** Brand-leakage fix → **M-S5** Logo redirect → **M-S2** Favicon

> Why first: these are quick wins (most ≤0.5 d), unblock everything else,
> and remove the most embarrassing production blockers. **~4 days.**

### Phase 1 — Security hardening
**Goal:** the app cannot be exploited or abused at launch.
1. **B2** Rate limiting (login/register)
2. **B4** CSRF protection
3. **B5** ADMIN/STAFF role separation (`requireAdmin`)
4. **H-A3** Server-side admin middleware gate
5. **H-D2** Upload content sniffing
6. **H-D3** AuditLog immutability
7. **H-D1** CHECK constraints
8. **L10** Centralised bcrypt helper

> Why here: security work touches every route; doing it before adding new
> routes avoids rework. **~10 days.**

### Phase 2 — Order & data integrity
**Goal:** customers cannot cheat the checkout; data is consistent.
1. **B3** Order integrity (server-authoritative shipping + transactional stock)
2. **H-A5** Order state machine
3. **H-A6** REFUNDED status UI
4. **H-S4** Reconcile image storage
5. **H-S2** Wire server cart
6. **H-S7** Cart wishlist-button fix
7. **H-S8** Cart badge global sync

> **~11 days.**

### Phase 3 — Admin completeness
**Goal:** staff can run the store without DB access.
1. **H-A2** Admin login screen
2. **H-A1** Product edit/delete UI
3. **H-A4** Pagination across admin lists
4. **H-A7** AuditLog viewer
5. **M-A1** Customer create/edit/role
6. **M-A2** Settings UI
7. **M-A3** Stock-adjustment + movements
8. **M-A4** Order timeline UI

> **~16 days.**

### Phase 4 — Storefront mobile + UX
**Goal:** the site is usable on a phone.
1. **B9** Mobile hamburger menu
2. **H-S6** Install Tailwind via build (replaces CDN)
3. **H-S1** Wire dead `href="#"` links
4. **H-S3** Wire colour/unit filters
5. **H-S5** Migrate siloed catalog pages to DB
6. **M-S1** Mini-cart drawer
7. **M-S4** Wire/remove orphan pages
8. **M-S6** Rename PDP route (`/product/[slug]`)
9. **L13, L14** PDP loader + dark-mode persistence

> **~13 days.**

### Phase 5 — Internationalisation + SEO
**Goal:** the site speaks Arabic and is discoverable.
1. **H-P3** i18n framework setup
2. **H-P2** Arabic strings + RTL layout
3. **H-SE1** Per-page meta tags
4. **H-SE2** OpenGraph + Twitter
5. **H-SE3** sitemap.xml + robots.txt
6. **H-SE4** JSON-LD
7. **H-SE5** Server-render product content (also helps H-SE1–4)

> **~22 days.** The heaviest phase — Arabic/RTL alone is ~10 days.

### Phase 6 — Payments + customer features
**Goal:** the site can take money and serve returning customers.
1. **H-P1** Payment gateway (KNET/Stripe/Tap)
2. **M-O3** Transactional email (required by M-C2/M-C3)
3. **M-C2** Password reset
4. **M-C3** Email verification
5. **M-C1** Saved addresses
6. **M-C4** Order detail + reorder

> **~20 days.**

### Phase 7 — Performance + observability
**Goal:** the site is fast and observable in production.
1. **M-PER1** Catalog caching
2. **M-PER2–4** Indexes (GIN, trigram, composite)
3. **M-PER5** next/image
4. **M-PER6** Session pruning
5. **M-O1** Structured logging
6. **M-O2** Error tracking (Sentry)

> **~8 days.**

### Phase 8 — Quality + CI
**Goal:** regressions are caught automatically.
1. **M-E1** ESLint + Prettier
2. **TD3** Shared response/validation helpers
3. **TD4** Remove unsafe casts
4. **M-E2** API route tests
5. **M-E3** Playwright E2E tests
6. **M-E4** CI pipeline

> **~15 days.**

### Phase 9 — Polish + forward-looking
**Goal:** nice-to-haves and debt paydown.
1. **L1–L14** as prioritised by the team
2. **TD7** Down-migration strategy
3. **L6** Remove `rackingpage/` + `code backup/`
4. **L8** Dead-code removal
5. **L11** Security headers (CSP/HSTS)
6. **L12** Backup strategy

> **~20 days, parallelisable.**

---

## 9. Effort summary

| Phase | Theme | Effort | Cumulative |
|---|---|---:|---:|
| 0 | Stabilise | 4 d | 4 d |
| 1 | Security hardening | 10 d | 14 d |
| 2 | Order & data integrity | 11 d | 25 d |
| 3 | Admin completeness | 16 d | 41 d |
| 4 | Storefront mobile + UX | 13 d | 54 d |
| 5 | i18n + SEO | 22 d | 76 d |
| 6 | Payments + customer | 20 d | 96 d |
| 7 | Performance + observability | 8 d | 104 d |
| 8 | Quality + CI | 15 d | 119 d |
| 9 | Polish + debt | 20 d | **139 d** |

**Total: ~139 engineer-days** (~7 months for one full-stack engineer, or
~10–12 weeks for a 2–3 engineer team working in parallel on independent
phases).

### Critical path
The longest dependency chain is:
> Phase 0 (4d) → Phase 1 (10d) → Phase 2 (11d) → Phase 6 payments (20d)
> → launchable

= **~45 days on the critical path** to a paid-launchable product (without
Arabic/SEO/tests). Adding Phase 5 (i18n + SEO, 22d) brings the
**market-ready** critical path to **~67 days** for one engineer.

### Parallelisation opportunities
These phases have weak dependencies and can run concurrently across a team:
- **Phase 3 (admin)** ∥ **Phase 4 (storefront)** ∥ **Phase 5 (i18n/SEO)** —
  three engineers could own these in parallel.
- **Phase 7 (perf)** ∥ **Phase 8 (tests)** — both touch many files but
  rarely the same ones.
- **Phase 9 (polish)** is filler that can run any time.

With **3 engineers**, realistic elapsed time to a market-ready launch is
**~10–12 weeks**.

---

## 10. Milestones

Six release-grade milestones, each independently shippable.

### 🚩 Milestone 0 — "Safe to develop on" (end of Phase 0+1)
**~14 days.** Secrets rotated, dedicated DB role, rate limiting, CSRF,
role separation, slug data fixed, dummy cart gone, brand leakage fixed.
The codebase is no longer an active liability.

**Exit criteria:**
- No secrets in `.env` are default/weak.
- Login is rate-limited; STAFF ≠ ADMIN.
- `Category.slug` matches `^[a-z0-9-]+$` for all rows.
- Fresh visitors see an empty cart, not dummy items.
- No page carries a non-AL-NASSIM brand.

### 🚩 Milestone 1 — "Honest checkout" (end of Phase 2)
**~25 days cumulative.** Order totals are server-authoritative, stock
cannot be oversold, cart syncs to the server for logged-in users. The
store can be trusted with real (COD) orders without integrity risk.

**Exit criteria:**
- `Order.shipping` is computed server-side from `Setting.shipping_fee`.
- Stock check + decrement are in the same transaction.
- Admin can move orders through a state machine (no illegal transitions).
- Product images have a single source of truth.

### 🚩 Milestone 2 — "Operable admin" (end of Phase 3)
**~41 days cumulative.** Staff can fully run the store from the admin UI —
edit/delete products, manage customers, adjust stock, view audit logs —
without touching the database.

**Exit criteria:**
- Admin login screen exists; server-side gate via middleware.
- Product edit + delete UI works.
- All admin lists paginate.
- AuditLog viewer is available.
- Settings UI controls `shipping_fee` (read by checkout).

### 🚩 Milestone 3 — "Mobile-ready storefront" (end of Phase 4)
**~54 days cumulative.** The site is usable on phones, Tailwind is built
(not CDN), dead links are wired, and the PDP has a clean URL. This is the
**minimum viable public launch** (English-only, COD-only).

**Exit criteria:**
- Hamburger menu works at ≤768px; all categories reachable.
- Tailwind compiled at build time (no Play CDN warning).
- No `href="#"` in primary navigation.
- `/product/[slug]` route replaces `product view.html`.

### 🚩 Milestone 4 — "Market-ready" (end of Phase 5+6)
**~96 days cumulative.** Arabic/RTL works, SEO is in place, online
payments are live, and customers can reset passwords + save addresses.
This is the **production launch** for the Kuwait market.

**Exit criteria:**
- `<html dir="rtl" lang="ar">` toggles correctly; all visible strings
  translated.
- Online payment gateway processes a test transaction end-to-end.
- Order confirmation emails send.
- `sitemap.xml` is generated; product pages have meta descriptions +
  JSON-LD.
- Google's Rich Results Test passes for a product URL.

### 🚩 Milestone 5 — "Production-hardened" (end of Phase 7+8)
**~119 days cumulative.** The site is fast, observable, and tested. CI
prevents regressions. This is the **post-launch hardening** that makes
the platform sustainable to operate.

**Exit criteria:**
- Lighthouse performance ≥ 80 on key pages.
- Catalog endpoints cached; GIN indexes on tags/specs.
- Structured logs ship to a sink; Sentry captures errors.
- API test coverage ≥ 70% of routes; E2E covers browse→checkout.
- CI runs on every PR.

Milestone 9 (polish) is ongoing and has no fixed exit.

---

## 11. Out of scope / explicit non-goals

To keep the roadmap focused, the following are **deliberately excluded**
from the launch plan:

- **A full React/Next.js storefront rebuild.** The current static-HTML
  storefront works; rebuilding it is a multi-month project of its own and
  is not required for launch. (`AGENTS.md.txt` hints at this direction but
  it is not on the critical path.)
- **Marketplace / multi-vendor** features.
- **Mobile apps** (native iOS/Android).
- **PWA / offline support.**
- **Advanced recommendation engine** (ML-driven).
- **Warehouse/ERP integration** beyond what the schema already models.
- **Subscription / recurring orders.**
- **B2B quote workflows** (the `INQUIRY` purchase mode is modelled but
  not built out — out of scope for v1).

These can be revisited after Milestone 5.

---

## 12. How to read this roadmap

- **Effort estimates** are in **engineer-days (d)** and assume one
  full-stack engineer familiar with Next.js/Prisma/PostgreSQL. They
  include design, implementation, code review, and basic manual testing —
  but **not** automated test authoring (which is broken out separately in
  Phase 8).
- **Severities** follow the audit convention: 🔴 Critical (launch-gate),
  🟠 High (credibility), 🟡 Medium (quality), 🟢 Low (polish).
- **Dependencies** are encoded by phase order — earlier phases unblock
  later ones. Within a phase, items can mostly be reordered.
- **This is a living document.** Re-baseline it after each milestone;
  the `Feature_Matrix.md` completion percentages should be updated as
  items ship.
- **No item here is optional for production** except the Low-priority
  bucket (§5) and the explicit non-goals (§11). Everything in §2–§4 is
  required for a defensible launch.

### Quick reference — what to do this week
If starting cold, the highest-leverage first week is:
1. **B1 + B12** — rotate secrets, create dedicated DB role (1.5 d)
2. **B7 + B8 + TD6** — fix slugs, fix seed routing, make seed idempotent (2 d)
3. **B10 + B11 + M-S5 + M-S2** — remove dummy cart, fix brand leakage, fix logo, add favicon (1.5 d)

That one week removes every "embarrassing on first look" issue and every
data-integrity landmine, for ~5 days of effort.
