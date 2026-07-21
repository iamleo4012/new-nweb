# MASTER DEVELOPMENT PLAN

> Project: **nassim-platform** (AL-NASSIM)
> Generated: 2026-07-21
> Sources of truth (read in full, not re-audited):
> `Project_Audit.md`, `Architecture.md`, `Current_Status.md`, `Technology_Stack.md`,
> `Database_Overview.md`, `Database_Audit.md`, `API_Overview.md`, `Folder_Structure.md`,
> `Feature_Matrix.md`, `UI_Audit.md`, `Roadmap.md` (≈33,000 words total).
> Method: **documentation only — no code was modified.**

This is the single source of truth for finishing the project. It supersedes
`Roadmap.md` as the operating plan: every remaining feature, every bug, every
gap, ordered for **maximum development speed with minimum regression risk**.

> **Reading guide:** §1 is the headline. §2–§12 are the complete backlog
> (features, bugs, gaps, debt, security, performance, SEO, deployment).
> §13–§18 are the execution strategy (testing, order, milestones, sprints,
> effort, parallelisation). §19–§20 are the dependency map and launch
> checklist. Every item carries a stable **ID** (e.g. `C-01`, `B-03`,
> `M-PER2`) so it can be tracked across sprints.

---

## Table of contents

1. [Overall project completion percentage](#1-overall-project-completion-percentage)
2. [Remaining features by priority](#2-remaining-features-by-priority)
3. [Bugs by severity](#3-bugs-by-severity)
4. [Incomplete APIs](#4-incomplete-apis)
5. [Incomplete frontend pages](#5-incomplete-frontend-pages)
6. [Incomplete admin features](#6-incomplete-admin-features)
7. [Missing database implementations](#7-missing-database-implementations)
8. [Technical debt](#8-technical-debt)
9. [Security improvements](#9-security-improvements)
10. [Performance improvements](#10-performance-improvements)
11. [SEO improvements](#11-seo-improvements)
12. [Deployment blockers](#12-deployment-blockers)
13. [Testing strategy](#13-testing-strategy)
14. [Exact implementation order](#14-exact-implementation-order)
15. [Milestones](#15-milestones)
16. [Sprint plan](#16-sprint-plan)
17. [Estimated effort per milestone](#17-estimated-effort-per-milestone)
18. [Independent vs dependent features](#18-independent-vs-dependent-features)
19. [Dependency graph](#19-dependency-graph)
20. [Final production checklist](#20-final-production-checklist)

---

## 1. Overall project completion percentage

Aggregated from `Current_Status.md §5` and `Feature_Matrix.md`, weighted for
production-readiness (a feature that works locally but ships via CDN, lacks
tests, or has no auth hardening is **not** 100%).

| Layer | Completion | Gap to launch |
|---|---:|---:|
| Database / schema | **90%** | −10 pp |
| Backend / API | **80%** | −20 pp |
| Admin panel | **55%** | −45 pp |
| Storefront (user website) | **45%** | −55 pp |
| Security & DevOps | **25%** | −75 pp |
| **Overall** | **~58%** | **~42 pp** |

```
Database        ████████████████████░  90%
Backend / API   ████████████████░░░░░  80%
Admin panel     ███████████░░░░░░░░░░  55%
Storefront      █████████░░░░░░░░░░░░  45%
Security/DevOps █████░░░░░░░░░░░░░░░░  25%
                                      ─────
Overall                               ~58%
```

**Distance to launch:** ~42 percentage points, concentrated in security,
mobile navigation, i18n, SEO, payments, and testing. The foundation
(schema, API skeleton, admin CRUD) is sound.

---

## 2. Remaining features by priority

Sourced from `Feature_Matrix.md` (90 features tracked), `Roadmap.md §2–§5`,
and `Current_Status.md §2`. Every item below is **not yet done**.

### 2.1 Critical (launch-gates) — 12 items

| ID | Feature | Source | Effort |
|---|---|---|---:|
| **C-01** | Rotate committed secrets (`.env` ships JWT secret, DB password `apple123`, admin password `Admin@12345`) | PA §3.1 | 0.5 d |
| **C-02** | Rate limiting on `/api/auth/login` + `/api/auth/register` (no `middleware.ts`) | PA §3.2 | 2 d |
| **C-03** | Server-authoritative order totals (currently trusts client `shipping` 0–100) | AO §7 B1 | 1.5 d |
| **C-04** | Transactional stock check (currently race/oversell — check outside txn) | AO §7 B2 | 1 d |
| **C-05** | CSRF protection (only `sameSite=lax` today) | PA §3.3 | 1.5 d |
| **C-06** | ADMIN/STAFF role separation (`requireAdmin`) | PA §3.4 | 1.5 d |
| **C-07** | Cloud storage for uploads (local FS breaks serverless; AGENTS.md mandates Supabase) | PA §3.5, TS §9 | 3 d |
| **C-08** | Fix `Category.slug` data (11 rows contain spaces/`&`) | DA §3.3 | 1 d |
| **C-09** | Mobile hamburger menu (mega-menu doesn't collapse; categories unreachable on phones) | UA §6.1 | 2 d |
| **C-10** | Remove dummy cart contents (ships "Hand-Forged Damascus Knife" + "Artisan Steel Fork Set") | UA §4.3 | 0.5 d |
| **C-11** | Fix template-brand leakage (`cool.html`→"Arctic Precision", `cold.html`→"Arctic Bespoke", `advertisment.html`→"Atelier Nord") | UA §4.8 | 0.5 d |
| **C-12** | Dedicated DB role + database (app connects as `postgres` superuser to `postgres` maintenance DB) | DA §15.1 | 1 d |

**Critical subtotal: ~16 d**

### 2.2 High — 28 items

#### Admin (7)
| ID | Feature | Source | Effort |
|---|---|---|---:|
| **H-A01** | Product edit + delete UI (API supports PATCH/DELETE; UI has no buttons) | PA §5 A1 | 3 d |
| **H-A02** | Dedicated admin login screen | PA §5 A2 | 2 d |
| **H-A03** | Server-side admin auth gate via `middleware.ts` | PA §5 A3 | 1.5 d |
| **H-A04** | Pagination on admin product/order/customer lists | AO §7 B4/B5 | 2 d |
| **H-A05** | Order state machine (any transition allowed today) | AO §7 B3 | 1.5 d |
| **H-A06** | `REFUNDED` status UI button (enum value exists, no UI) | UA §14.3 | 0.5 d |
| **H-A07** | AuditLog viewer (written by every mutation, no UI reads it) | FM §6.10 | 2 d |

#### Storefront (8)
| ID | Feature | Source | Effort |
|---|---|---|---:|
| **H-S01** | Wire 33 `href="#"` dead links (footer, mega-menu, CTAs) | UA §7.2 | 1.5 d |
| **H-S02** | Wire server cart API (storefront uses localStorage only) | FM §3.2 | 2 d |
| **H-S03** | Wire colour/unit filter checkboxes (UI present, no handler) | UA §4.2 | 1 d |
| **H-S04** | Reconcile triple image storage (`image`/`images`/`ProductImage`) | DA §11.1 | 2 d |
| **H-S05** | Migrate siloed catalog pages (`forklift`/`rack`/`trolly` inline arrays) to DB | UA §4.7 | 2 d |
| **H-S06** | Install Tailwind via build (replace Play CDN) | TS §6 | 1.5 d |
| **H-S07** | Fix cart "wishlist" button (only toggles icon, doesn't move item) | UA §4.3 | 0.5 d |
| **H-S08** | Global cart badge sync (only updates on cart/PDP) | UA §4 M1 | 0.5 d |

#### Payments & i18n (3)
| ID | Feature | Source | Effort |
|---|---|---|---:|
| **H-P01** | Online payment gateway (Stripe/KNET/Tap; COD-only today) | FM §4.8 | 8 d |
| **H-P02** | Arabic / RTL layout + strings (mandated by AGENTS.md) | UA §11 | 10 d |
| **H-P03** | i18n framework (next-intl / react-i18next) | FM §8.2 | 3 d |

#### SEO (5)
| ID | Feature | Source | Effort |
|---|---|---|---:|
| **H-SE01** | Per-page meta tags (`<title>`, `<meta description>`) | UA §15 | 2 d |
| **H-SE02** | OpenGraph + Twitter cards | FM §9.2 | 1 d |
| **H-SE03** | `sitemap.xml` + `robots.txt` | FM §9.3 | 1 d |
| **H-SE04** | JSON-LD structured data (Product, Organization) | FM §9.4 | 1.5 d |
| **H-SE05** | Server-render product content (JS-rendered today, invisible to crawlers) | UA §15 | 3 d |

#### Database integrity (3)
| ID | Feature | Source | Effort |
|---|---|---|---:|
| **H-D01** | CHECK constraints (zero today; negative prices/stocks legal) | DA §5 | 1 d |
| **H-D02** | File-upload content sniffing (MIME client-trusted) | PA §3.5 | 1 d |
| **H-D03** | AuditLog immutability (revoke UPDATE/DELETE) | DA §15.5 | 0.5 d |

#### Misc (2)
| ID | Feature | Source | Effort |
|---|---|---|---:|
| **H-M01** | Transactional email (order confirmations, status updates) — required by M-C02/M-C03 | FM §12.4 | 3 d |
| **H-M02** | Centralised bcrypt helper (cost 10 duplicated in 3 places; bump to 12) | DA §15.4 | 0.5 d |

**High subtotal: ~58 d**

### 2.3 Medium — 27 items

#### Performance (6)
| ID | Feature | Effort |
|---|---|---:|
| **M-PER1** | Cache public catalog endpoints (force-dynamic + no-store today) | 1.5 d |
| **M-PER2** | GIN indexes on `Product.tags` + `Product.specs` | 0.5 d |
| **M-PER3** | Trigram/full-text index for ILIKE search | 1 d |
| **M-PER4** | Composite indexes (`Product(isActive,categoryId)`, `Order(userId,createdAt)`) | 0.5 d |
| **M-PER5** | `next/image` for responsive/WebP images | 2 d |
| **M-PER6** | Expired-session pruning job | 0.5 d |

#### Customer account (4)
| ID | Feature | Effort |
|---|---|---:|
| **M-C01** | Saved-addresses CRUD (`Address` model exists, no API/UI) | 2 d |
| **M-C02** | Password reset / forgot password (depends on H-M01) | 3 d |
| **M-C03** | Email verification on signup (depends on H-M01) | 2 d |
| **M-C04** | Order detail view + reorder | 2 d |

#### Admin completeness (4)
| ID | Feature | Effort |
|---|---|---:|
| **M-A01** | Customer create/edit/role-change | 2 d |
| **M-A02** | Settings management UI (checkout ignores `shipping_fee` setting) | 1.5 d |
| **M-A03** | Stock-adjustment UI that writes `StockMovement` | 2 d |
| **M-A04** | Order timeline UI reading `OrderStatusEvent` | 1 d |

#### Storefront polish (6)
| ID | Feature | Effort |
|---|---|---:|
| **M-S01** | Mini-cart drawer (slide-out from any page) | 2 d |
| **M-S02** | Favicon (currently 404) | 0.25 d |
| **M-S03** | Faceted filtering (brand/material/tag) with endpoint | 3 d |
| **M-S04** | Wire/remove orphan pages (`microfiber`, `advertisment`, `cool`, `cold`, `house`) | 0.5 d |
| **M-S05** | Fix logo redirect (`/code.html` → 308 → home) | 0.1 d |
| **M-S06** | Rename PDP route (`product view.html` → `/product/[slug]`) | 1 d |

#### Engineering quality (4)
| ID | Feature | Effort |
|---|---|---:|
| **M-E01** | ESLint + Prettier config | 1 d |
| **M-E02** | API route tests (Vitest/Jest) | 5 d |
| **M-E03** | Playwright E2E tests (browse→cart→checkout→order) | 4 d |
| **M-E04** | CI pipeline (GitHub Actions) | 1.5 d |

#### Observability (3)
| ID | Feature | Effort |
|---|---|---:|
| **M-O01** | Structured logging (pino/winston) | 1.5 d |
| **M-O02** | Error tracking (Sentry) | 1 d |
| **M-O03** | Transactional email provider wiring (Resend/SendGrid) — pairs with H-M01 | 3 d |

**Medium subtotal: ~55 d**

### 2.4 Low — 14 items

| ID | Feature | Effort |
|---|---|---:|
| **L-01** | Multi-currency support | 3 d |
| **L-02** | Product recommendations endpoint | 2 d |
| **L-03** | Loyalty / wallet features | 5 d |
| **L-04** | Analytics integration (GA/PostHog) | 1.5 d |
| **L-05** | GDPR account deletion / data export | 2 d |
| **L-06** | Remove `rackingpage/` prototype + `code backup/` | 0.5 d |
| **L-07** | Reconcile `AGENTS.md.txt` with actual stack | 0.5 d |
| **L-08** | Remove dead code (`filteredSubcategories`, `multiselect` type, `defaultOrderBy`, `carousel_js.txt`, `home.html` dup) | 1 d |
| **L-09** | Partial unique index for `Address.isDefault` | 0.25 d |
| **L-10** | Security headers (CSP, HSTS, Permissions-Policy) | 1 d |
| **L-11** | Database backup strategy + docs | 1 d |
| **L-12** | Replace `document.write` catalog fallback on PDP | 0.5 d |
| **L-13** | Persist dark-mode preference reliably in localStorage | 0.5 d |
| **L-14** | Make `down` migrations / rollback strategy | 2 d |

**Low subtotal: ~20 d**

---

## 3. Bugs by severity

Consolidated from `Project_Audit.md §3–§7`, `API_Overview.md §7`, `Database_Audit.md §16`, `UI_Audit.md §16`.

### 3.1 Critical bugs (data integrity / security)
| ID | Bug | Location | Effort |
|---|---|---|---:|
| **BUG-C01** | Secrets committed in `.env` | repo root | (in C-01) |
| **BUG-C02** | Order `shipping` trusted from client (0–100 arbitrary) | `app/api/orders/route.ts:85` | (in C-03) |
| **BUG-C03** | Stock check outside transaction (race/oversell) | `app/api/orders/route.ts:59 vs 117` | (in C-04) |
| **BUG-C04** | STAFF ≡ ADMIN (no `requireAdmin`) | `lib/auth.ts:66-70` | (in C-06) |
| **BUG-C05** | All 11 `Category.slug` contain spaces/`&` (violates `^[a-z0-9-]+$`) | live DB | (in C-08) |
| **BUG-C06** | Seed routes all categories to `houseware`; `warehouse` dept empty | `prisma/seed.mjs:18,39,42` | (in C-08) |
| **BUG-C07** | Default cart ships dummy items | `public/cart.html:95-120` | (in C-10) |
| **BUG-C08** | 3 pages carry wrong brand names | `cool/cold/advertisment.html` | (in C-11) |
| **BUG-C09** | App connects as `postgres` superuser | `.env DATABASE_URL` | (in C-12) |

### 3.2 High bugs (functional / UX)
| ID | Bug | Location | Effort |
|---|---|---|---:|
| **BUG-H01** | No mobile hamburger menu (23/31 nav items hidden at 390px) | all storefront HTML | (in C-09) |
| **BUG-H02** | 33/49 homepage links are `href="#"` | `index.html` + all | (in H-S01) |
| **BUG-H03** | No product edit/delete UI despite API support | `ProductsTab.tsx` | (in H-A01) |
| **BUG-H04** | Cart "wishlist" button only toggles icon (doesn't move item) | `cart.html:281-287` | (in H-S07) |
| **BUG-H05** | Colour/unit filters have no JS handler | `kitchenware.html:398-406` | (in H-S03) |
| **BUG-H06** | PDP requires `?id=slug`; bare visit shows "Not Found" | `product view.html` | (in M-S06) |
| **BUG-H07** | Tailwind Play CDN warning on every page | all HTML + admin layout | (in H-S06) |
| **BUG-H08** | 3 siloed catalog pages drift from DB | `forklift/rack/trolly.html` | (in H-S05) |
| **BUG-H09** | Logo links to `/code.html` (308 bounce to home) | `index.html:420` | (in M-S05) |
| **BUG-H10** | 5 orphan pages unreachable from nav | `microfiber/cool/cold/house/advertisment` | (in M-S04) |
| **BUG-H11** | Triple image storage drift (`image`/`images`/`ProductImage`) | schema + storefront | (in H-S04) |
| **BUG-H12** | `EN | AR` toggle is decorative (no handler) | all HTML | (in H-P02) |
| **BUG-H13** | No admin login screen | `app/admin/` | (in H-A02) |
| **BUG-H14** | Admin auth gate client-side only | `AdminApp.tsx:90` | (in H-A03) |
| **BUG-H15** | No order state machine (any transition) | `admin/orders/route.ts:96` | (in H-A05) |
| **BUG-H16** | No rate limiting on login/register | `auth/login`, `auth/register` | (in C-02) |

### 3.3 Medium bugs
| ID | Bug | Location |
|---|---|---|
| **BUG-M01** | Favicon 404 | `next.config.mjs` / `public/` |
| **BUG-M02** | Cart badge not updated on home/category pages | `cart-nav.js` coverage |
| **BUG-M03** | PDP `document.write` fallback is fragile | `product view.html:171` |
| **BUG-M04** | PDP filename has a literal space | `public/product view.html` |
| **BUG-M05** | No skip-to-content link | all pages |
| **BUG-M06** | 17 icon-only links missing `aria-label` | storefront headers/footers |
| **BUG-M07** | `admin/customers/[id]` PATCH has no Zod | `route.ts:102` |
| **BUG-M08** | `admin/hierarchy` DELETE misclassifies not-found P2025 as 409 | `route.ts:224-229` |
| **BUG-M09** | `admin/master` uses `as unknown as Record<...>` casts | `route.ts:108-111` |
| **BUG-M10** | `defaultOrderBy` declared but never read | `master/[entity]/route.ts:24` |
| **BUG-M11** | Category fallback leaks other categories when none match | `kitchenware.html:627-629` |
| **BUG-M12** | Dark-mode persistence to localStorage unreliable | `dark-overrides.js` |
| **BUG-M13** | Seed overwrites admin edits on re-run | `seed.mjs:64` |
| **BUG-M14** | `tsconfig.tsbuildinfo` committed (~108 KB) | repo root |
| **BUG-M15** | 2 corrupted/truncated PNGs in `public/uploads/` | `public/uploads/` |
| **BUG-M16** | ChatGPT-generated asset filename shipped | `topcar/products_houseware/` |
| **BUG-M17** | Google stock images (`aida-public`) on 18+ pages | many HTML files |
| **BUG-M18** | Response envelope inconsistent (`orders` returns both top-level + `data.order`) | `orders/route.ts:127-146,183` |

### 3.4 Low bugs
| ID | Bug | Location |
|---|---|---|
| **BUG-L01** | `REFUNDED` status has no UI button | `AdminApp.tsx:51-60` |
| **BUG-L02** | Status enum sets inconsistent (`AdminApp` omits REFUNDED, `CustomersTab` includes) | `AdminApp.tsx` vs `CustomersTab.tsx` |
| **BUG-L03** | `fmt()` hardcodes 3-decimal KWD (no currency awareness) | `AdminApp.tsx:73` |
| **BUG-L04** | Admin orders GET caps `take:200` no pagination | `admin/orders/route.ts:69` |
| **BUG-L05** | Admin products GET returns all products no pagination | `admin/products/route.ts` |
| **BUG-L06** | Cart POST upsert replaces qty (counter-intuitive for "add to cart") | `cart/route.ts:63` |
| **BUG-L07** | Revenue counts non-cancelled orders regardless of payment status | `admin/stats/route.ts` |
| **BUG-L08** | `Order.orderNumber` unique index never scanned (no lookups by it) | `Order_orderNumber_key` |
| **BUG-L09** | Force-dynamic on public catalog routes (no caching) | `catalog/products/categories` |
| **BUG-L10** | `BARCODE` index never scanned (all barcodes empty) | `Product_barcode_idx` |

---

## 4. Incomplete APIs

From `API_Overview.md §2` and `Feature_Matrix.md §1–§7`.

### 4.1 Missing endpoints (entire routes)
| ID | Endpoint | Purpose | Depends on |
|---|---|---|---|
| **API-M01** | `POST /api/auth/password-reset/request` + `/reset` | Forgot-password flow | H-M01 (email) |
| **API-M02** | `GET /api/auth/verify-email` | Email verification | H-M01 |
| **API-M03** | `GET/POST/PATCH/DELETE /api/addresses` | Saved-address CRUD | — |
| **API-M04** | `GET /api/orders/[id]` | Order detail (for M-C04) | — |
| **API-M05** | `POST /api/orders/[id]/reorder` | Reorder past order | API-M04 |
| **API-M06** | `GET/POST/PATCH/DELETE /api/admin/settings` | Settings management | — |
| **API-M07** | `GET /api/admin/audit-log` | AuditLog viewer | — |
| **API-M08** | `GET /api/admin/orders/[id]/timeline` | Order status timeline | — |
| **API-M09** | `POST /api/admin/products/[id]/stock` | Stock adjustment (writes StockMovement) | — |
| **API-M10** | `GET /api/products/facets` | Faceted filtering (brand/material/tag) | — |
| **API-M11** | `POST /api/payments/intent` + webhook | Payment gateway | H-P01 |
| **API-M12** | `GET /api/sitemap.xml` + `/robots.txt` (or static) | SEO | — |

### 4.2 Existing endpoints with missing methods/bugs
| Endpoint | Gap |
|---|---|
| `GET /api/admin/orders` | No pagination (caps `take:200`) — BUG-L04 |
| `GET /api/admin/products` | No pagination — BUG-L05 |
| `PATCH /api/admin/orders` | No state machine — BUG-H15 |
| `PATCH /api/admin/customers/[id]` | No Zod — BUG-M07 |
| `DELETE /api/admin/hierarchy/[entity]` | Misclassifies P2025 as 409 — BUG-M08 |
| `POST /api/cart` | Replaces qty not increment; no stock check — BUG-L06, AO §7 B6 |
| `PATCH /api/auth/me` | Allows email change without password re-verification |
| All admin routes | No `requireAdmin` (STAFF can do everything) — BUG-C04 |
| All public catalog routes | Force-dynamic, no caching — BUG-L09 |

---

## 5. Incomplete frontend pages

From `UI_Audit.md` and `Feature_Matrix.md §3,§7,§9`.

### 5.1 Missing pages (don't exist)
| ID | Page | Priority |
|---|---|---|
| **FE-M01** | Admin login page (`/admin/login`) | High (H-A02) |
| **FE-M02** | Forgot-password page | Medium (M-C02) |
| **FE-M03** | Reset-password page | Medium (M-C02) |
| **FE-M04** | Email-verification page | Medium (M-C03) |
| **FE-M05** | Customer account addresses tab | Medium (M-C01) |
| **FE-M06** | Order detail page (`/account/orders/[id]`) | Medium (M-C04) |
| **FE-M07** | Admin AuditLog viewer page | High (H-A07) |
| **FE-M08** | Admin Settings page | Medium (M-A02) |
| **FE-M09** | 404 / 500 error pages (custom) | Low |
| **FE-M10** | `/product/[slug]` Next.js route (replaces `product view.html`) | Medium (M-S06) |

### 5.2 Existing pages with gaps
| Page | Gap | Priority |
|---|---|---|
| All 24 storefront HTML pages | No hamburger menu | Critical (C-09) |
| All storefront pages | No Arabic/RTL | Critical (H-P02) |
| All storefront pages | Tailwind via CDN | High (H-S06) |
| `cart.html` | Dummy items on first visit | Critical (C-10) |
| `cool.html`, `cold.html`, `advertisment.html` | Wrong brand | Critical (C-11) |
| `forklift.html`, `rack.html`, `trolly.html` | Siloed inline catalogs | High (H-S05) |
| `kitchenware.html` (and category pages) | Dead colour/unit filters | High (H-S03) |
| All category pages | Fallback leaks other categories | Medium (BUG-M11) |
| All pages | 33 `href="#"` dead links | High (H-S01) |
| All pages | No SEO meta/OG/JSON-LD | High (H-SE01–04) |
| All pages | No favicon | Medium (M-S02) |
| All pages | No skip-link; 17 icon-only links | Medium (BUG-M05/M06) |
| `product view.html` | Requires `?id=`; space in filename; `document.write` | Medium (BUG-H06/M03/M04) |
| `microfiber/cool/cold/house/advertisment.html` | Orphan pages | Medium (M-S04) |

---

## 6. Incomplete admin features

From `Feature_Matrix.md §6` and `UI_Audit.md §14`.

| ID | Feature | Status | Effort |
|---|---|---|---:|
| **ADM-01** | Product **edit** UI | Missing | (in H-A01) |
| **ADM-02** | Product **delete** UI | Missing | (in H-A01) |
| **ADM-03** | Admin **login screen** | Missing | (in H-A02) |
| **ADM-04** | **Pagination** on all lists | Missing | (in H-A04) |
| **ADM-05** | **Order state machine** | Missing | (in H-A05) |
| **ADM-06** | **`REFUNDED` button** | Missing | (in H-A06) |
| **ADM-07** | **AuditLog viewer** | Missing | (in H-A07) |
| **ADM-08** | Customer **create/edit/role-change** | Missing | (in M-A01) |
| **ADM-09** | **Settings** UI | Missing | (in M-A02) |
| **ADM-10** | **Stock adjustment** UI (writes StockMovement) | Missing | (in M-A03) |
| **ADM-11** | **Order timeline** UI | Missing | (in M-A04) |
| **ADM-12** | **Bulk operations** (product bulk edit/delete) | Missing | (future) |
| **ADM-13** | **2FA** for admin accounts | Missing | (future) |

**Completed admin modules** (credit): Master Data CRUD (12 entities), Hierarchy CRUD (4 entities), Dashboard/Stats, Image upload + media library, Customer activate/deactivate, Order status change.

---

## 7. Missing database implementations

From `Database_Audit.md §8, §9, §10, §15` and `Database_Overview.md §7`.

### 7.1 Tables defined but never written/read by code
| Table | Status | Required action |
|---|---|---|
| `StockMovement` | Defined + indexed, **0 rows, never written** | Wire via API-M09 + ADM-10 |
| `Address` | Defined, **no API** | Build API-M03 + FE-M05 |
| `ProductImage` | Admin writes, **storefront bypasses** (reads `image`/`images`) | Reconcile via H-S04 |
| `Section` | Schema + admin CRUD, **0 rows, storefront ignores** | Surface on storefront OR document as future |
| `Subcategory` | Same as Section | Same |
| `CartItem` | Full API, **storefront uses localStorage** | Wire via H-S02 |
| `OrderStatusEvent` | Written on every change, **no UI reads it** | Build API-M08 + ADM-11 |

### 7.2 Enum values with no code path
| Value | Status |
|---|---|
| `OrderStatus.REFUNDED` | In enum, no button, no logic — BUG-L01 |
| `StockStatus.LOW_STOCK / PREORDER / DISCONTINUED` | In enum, never auto-set; `minStock` exists but no job compares stock to minStock |

### 7.3 Missing schema objects
| ID | Object | Purpose |
|---|---|---|
| **DB-M01** | `Payment` / `PaymentMethod` tables | Online payments (H-P01) |
| **DB-M02** | `PasswordResetToken` table (or columns on User) | M-C02 |
| **DB-M03** | `EmailVerificationToken` (or `User.emailVerifiedAt`) | M-C03 |
| **DB-M04** | `Coupon` / `DiscountCode` tables | Future |
| **DB-M05** | `Tag` table + `ProductTag` join | Faceted tags (M-S03) |
| **DB-M06** | `ShippingMethod` table | Replace hardcoded shipping |
| **DB-M07** | CHECK constraints (prices/stocks/totals ≥ 0, hex format) | H-D01 |
| **DB-M08** | GIN index on `Product.tags` + `Product.specs` | M-PER2 |
| **DB-M09** | Trigram index for ILIKE search (pg_trgm extension) | M-PER3 |
| **DB-M10** | Composite indexes (isActive+categoryId, userId+createdAt) | M-PER4 |
| **DB-M11** | Unique index on `Product.sku` | (optional) |
| **DB-M12** | Partial unique index `Address(userId) WHERE isDefault` | L-09 |
| **DB-M13** | Foreign tables for `Order.addressId`, `Order.shippingMethodId`, `Order.staffId` | Future |

---

## 8. Technical debt

From `Project_Audit.md §8`, `Roadmap.md §6`, `Database_Audit.md §16`.

| ID | Debt item | Impact | Effort |
|---|---|---|---:|
| **TD-01** | Tailwind via Play CDN (admin + storefront) | Production-blocker; runtime CSS compile | (in H-S06) |
| **TD-02** | No `middleware.ts` (every route self-gates) | Security fragility | (in H-A03) |
| **TD-03** | No shared response/validation helpers (every route hand-writes) | Inconsistency | 2 d |
| **TD-04** | `as unknown as Record<...>` casts in `admin/master` route | Type-safety hole | 1 d |
| **TD-05** | Schema ahead of code (~30% of tables unused) | Dead capacity | (covered by §7 work) |
| **TD-06** | Seed overwrites admin edits on re-run | Data-loss footgun | 0.5 d |
| **TD-07** | No down migrations (forward-only) | Recovery risk | 2 d |
| **TD-08** | Copy-pasted header/footer across 24 HTML files | Drift | (in M-S06 / future React storefront) |
| **TD-09** | Three product catalogs that drift | Data integrity | (in H-S05) |
| **TD-10** | `tsconfig.tsbuildinfo` committed | Repo hygiene | 0.1 d |
| **TD-11** | Enum values immutable (PG limitation; removal needs rebuild) | Future-flex | (document only) |
| **TD-12** | 2 corrupted PNGs + ChatGPT-generated asset filename | Repo hygiene | 0.1 d |
| **TD-13** | `rackingpage/` Vite prototype + `code backup/` not integrated | Repo noise | (in L-06) |
| **TD-14** | `AGENTS.md.txt` diverges from actual stack | Confusion | (in L-07) |
| **TD-15** | Dead code (`filteredSubcategories`, `multiselect` type, `defaultOrderBy`, `carousel_js.txt`, `home.html` dup) | Maintainability | (in L-08) |
| **TD-16** | `home.html` is near-duplicate of `index.html`, still shipped | Confusion | (in L-08) |
| **TD-17** | Orphan pages (`microfiber/cool/cold/house/advertisment`) | Navigation gaps | (in M-S04) |
| **TD-18** | Inline Tailwind config duplicated per HTML page (~60 tokens × 24 pages) | Drift | (in H-S06) |
| **TD-19** | `fmt()` hardcoded to 3-decimal KWD | No multi-currency | (in L-01) |
| **TD-20** | bcrypt cost duplicated in 3 places | Inconsistency | (in H-M02) |

**Net-new technical-debt effort: ~8 d** (most is covered by feature tasks above).

---

## 9. Security improvements

From `Project_Audit.md §3`, `API_Overview.md §8`, `Database_Audit.md §15`, `Feature_Matrix.md §11`.

| ID | Improvement | Priority | Effort |
|---|---|---|---:|
| **SEC-01** | Rotate committed secrets (JWT, DB pw, admin pw) | Critical | 0.5 d |
| **SEC-02** | Dedicated DB role + database (not superuser) | Critical | 1 d |
| **SEC-03** | Rate limiting on auth endpoints | Critical | 2 d |
| **SEC-04** | CSRF protection tokens | Critical | 1.5 d |
| **SEC-05** | `requireAdmin` role separation | Critical | 1.5 d |
| **SEC-06** | Server-side admin gate (`middleware.ts`) | High | 1.5 d |
| **SEC-07** | File-upload content sniffing (magic-number) | High | 1 d |
| **SEC-08** | AuditLog immutability (revoke UPDATE/DELETE) | High | 0.5 d |
| **SEC-09** | CHECK constraints (defence-in-depth) | High | 1 d |
| **SEC-10** | Centralised bcrypt helper (cost 12) | High | 0.5 d |
| **SEC-11** | CSP, HSTS, Permissions-Policy headers | Medium | 1 d |
| **SEC-12** | Password re-verification on email change | Medium | 0.5 d |
| **SEC-13** | Row-level security (customer sees only own orders) | Medium | 2 d |
| **SEC-14** | Password complexity rules (beyond length 8) | Medium | 0.5 d |
| **SEC-15** | Account lockout after N failed attempts | Medium | 1 d |
| **SEC-16** | 2FA for admin accounts | Low | 3 d |
| **SEC-17** | Security headers audit (Mozilla Observatory pass) | Low | 0.5 d |

**Strengths already in place** (per audit): zero raw SQL (no injection surface), `passwordHash` stripped from responses, sessions DB-backed and revocable, sane cookie attributes (httpOnly, secure-in-prod, sameSite-lax).

---

## 10. Performance improvements

From `Database_Audit.md §13`, `API_Overview.md §7`, `UI_Audit.md §13`, `Feature_Matrix.md §10,§13`.

| ID | Improvement | Priority | Effort |
|---|---|---|---:|
| **PER-01** | Cache public catalog endpoints (remove force-dynamic + no-store) | Medium | 1.5 d |
| **PER-02** | GIN indexes on `Product.tags` + `Product.specs` | Medium | 0.5 d |
| **PER-03** | Trigram index (`pg_trgm`) for ILIKE search | Medium | 1 d |
| **PER-04** | Composite indexes (`Product(isActive,categoryId)`, `Order(userId,createdAt)`) | Medium | 0.5 d |
| **PER-05** | `next/image` for responsive/WebP images | Medium | 2 d |
| **PER-06** | Expired-session pruning job | Medium | 0.5 d |
| **PER-07** | Admin list pagination (cursor or offset) | High | 2 d |
| **PER-08** | Lazy-load images (`loading="lazy"`) on storefront | Medium | 0.5 d |
| **PER-09** | Prefetch product detail on card hover | Low | 0.5 d |
| **PER-10** | Lighthouse target ≥ 80 on key pages | Medium | 1 d |
| **PER-11** | Database connection pooler (PgBouncer) for production | Medium | 1 d |
| **PER-12** | Replace Google-hosted stock images with local/CDN assets | Medium | 1 d |

**Current state:** homepage TTFB 11 ms, load 732 ms locally (snappy). Bottlenecks are CDN/image/cache choices, not app logic. Hot indexes: `Session_pkey` (173 scans), `User_pkey` (197), `Category_pkey` (131). 13 of 35 non-PK indexes have 0 scans.

---

## 11. SEO improvements

From `UI_Audit.md §15`, `Feature_Matrix.md §9`.

| ID | Improvement | Priority | Effort |
|---|---|---|---:|
| **SEO-01** | Per-page `<title>` (homepage is "AL-NASSIM" 9 chars) | High | 1 d |
| **SEO-02** | `<meta name="description">` on every page | High | 1 d |
| **SEO-03** | OpenGraph tags (`og:title`, `og:image`, `og:url`) | High | 1 d |
| **SEO-04** | Twitter card tags | High | 0.5 d |
| **SEO-05** | `<link rel="canonical">` | High | 0.5 d |
| **SEO-06** | `<meta name="robots">` + `robots.txt` | High | 0.5 d |
| **SEO-07** | `sitemap.xml` (auto-generated) | High | 1 d |
| **SEO-08** | JSON-LD structured data (Product, Organization, BreadcrumbList) | High | 1.5 d |
| **SEO-09** | Meaningful `<h1>` (homepage H1 is "FIRE.") | High | 0.25 d |
| **SEO-10** | Server-render product content (not JS-injected) | High | 3 d |
| **SEO-11** | Image `alt` text audit (all have alt today, but some generic) | Medium | 0.5 d |
| **SEO-12** | Breadcrumbs with structured data | Medium | 1 d |
| **SEO-13** | Google Search Console verification | Low | 0.25 d |

**Current state:** title "AL-NASSIM", no meta description, no OG/Twitter, no canonical, no JSON-LD, no sitemap, no robots.txt, single H1 reading "FIRE.", JS-rendered catalog (invisible to crawlers). The one positive: PDP sets a per-product `<title>` dynamically.

---

## 12. Deployment blockers

From `Project_Audit.md §3`, `Technology_Stack.md §9,§10`, `Architecture.md §10`, `Roadmap.md §2`.

These **must** be resolved before the app can deploy to a production target
(especially a managed platform like Vercel/Supabase as AGENTS.md implies).

| ID | Blocker | Why it blocks | Effort |
|---|---|---|---:|
| **DEP-01** | Secrets committed in `.env` | Active security liability | 0.5 d |
| **DEP-02** | App connects as `postgres` superuser | Privilege escalation if app compromised | 1 d |
| **DEP-03** | File uploads write to `public/uploads/` (local FS) | Breaks on serverless/read-only hosts; lost on redeploy | 3 d |
| **DEP-04** | Tailwind loaded from public CDN at runtime | External dependency; production-discouraged | 1.5 d |
| **DEP-05** | No `middleware.ts` | Cannot enforce auth/rate-limit/CSRF at edge | (in SEC-06) |
| **DEP-06** | No rate limiting | Brute-force/abuse on launch | 2 d |
| **DEP-07** | No environment-variable strategy | Secrets management | 1 d |
| **DEP-08** | No CI/CD pipeline | Cannot ship safely | 1.5 d |
| **DEP-09** | No backup strategy | Data-loss risk | 1 d |
| **DEP-10** | No logging/monitoring | Blind in production | 1.5 d |
| **DEP-11** | No health-check endpoint | Cannot be monitored | 0.25 d |
| **DEP-12** | Order integrity (shipping/stock) | Cannot take real money safely | 2.5 d |
| **DEP-13** | No deployment documentation | Cannot hand off | 1 d |
| **DEP-14** | README.md does not exist | Onboarding | 0.5 d |

---

## 13. Testing strategy

From `Feature_Matrix.md §13`, `Current_Status.md §9`, `Roadmap.md §8 Phase 8`.

Current state: **zero automated tests**, no test framework installed, no CI.

### 13.1 Strategy overview

```
                        ┌─────────────────┐
                        │   Static (now)  │  tsc --noEmit (strict ON)
                        └────────┬────────┘
                                 │
                  ┌──────────────▼──────────────┐
                  │   Unit tests  (Phase 8a)    │  Vitest
                  │   - lib/auth.ts (sessions)  │
                  │   - lib/validation (Zod)    │
                  │   - seed.mjs helpers        │
                  └──────────────┬──────────────┘
                                 │
                  ┌──────────────▼──────────────┐
                  │ Integration tests (Phase 8b)│  Vitest + test DB
                  │   - every API route         │
                  │   - auth gating (401/403)   │
                  │   - order creation txn      │
                  │   - admin CRUD + audit log  │
                  └──────────────┬──────────────┘
                                 │
                  ┌──────────────▼──────────────┐
                  │  E2E tests (Phase 8c)       │  Playwright
                  │   - browse → cart → checkout│
                  │   - login → orders          │
                  │   - admin product CRUD      │
                  │   - mobile hamburger        │
                  └──────────────┬──────────────┘
                                 │
                  ┌──────────────▼──────────────┐
                  │   CI (Phase 8d)             │  GitHub Actions
                  │   - typecheck + lint + test │
                  │   - prisma migrate check    │
                  │   - build                   │
                  └─────────────────────────────┘
```

### 13.2 Tooling choices
- **Unit + Integration:** Vitest (fast, native ESM, Jest-compatible API). Add `@vitest/coverage-v8`.
- **E2E:** Playwright (already used for the UI audit; cross-browser).
- **DB for integration tests:** Separate `nassim_test` database; reset via `prisma migrate reset` in `beforeEach`.
- **Mocking:** MSW (Mock Service Worker) for storefront vanilla-JS where needed; Prisma mock for pure unit tests.
- **Coverage targets:** API routes ≥ 70%, lib ≥ 90%, E2E covers the 3 critical paths (browse, checkout, admin CRUD).

### 13.3 Critical paths to cover first (smoke tests)
1. **Checkout:** browse → add to cart → checkout → POST `/api/orders` → order created with correct totals + stock decrement.
2. **Auth:** register → login → GET `/api/auth/me` → logout → 401 on protected route.
3. **Admin gating:** anonymous → `/api/admin/*` returns 401/403; STAFF → can read; (after SEC-05) non-admin operation → 403.

### 13.4 Test-first rule for bug fixes
Every bug fix in §3 **must** ship with a regression test. No exceptions. This is the primary regression-minimisation lever in this plan.

---

## 14. Exact implementation order

Ordered for **minimum rework and minimum regression**. Dependencies are
encoded by phase; do not skip phases.

### Phase 0 — Stabilise (4 d)
> Goal: stop the bleeding; make the codebase safe to build on.
1. **SEC-01 / C-01** Rotate secrets
2. **SEC-02 / C-12** Dedicated DB role + database
3. **TD-10, TD-12** Remove committed `tsconfig.tsbuildinfo` + corrupted PNGs
4. **L-07 / TD-14** Reconcile `AGENTS.md.txt`
5. **C-08 / BUG-C05/C06** Slug cleanup + seed routing fix
6. **TD-06 / BUG-M13** Seed idempotency (don't overwrite admin edits)
7. **C-10 / BUG-C07** Remove dummy cart contents
8. **C-11 / BUG-C08** Fix template-brand leakage
9. **M-S05 / BUG-H09** Fix logo redirect
10. **M-S02 / BUG-M01** Add favicon

### Phase 1 — Security hardening (10 d)
> Goal: the app cannot be exploited or abused.
1. **SEC-03 / C-02** Rate limiting (login/register) — needs DEP-05
2. **DEP-05** Create `middleware.ts` (foundation for SEC-03/04/06)
3. **SEC-04 / C-05** CSRF protection
4. **SEC-05 / C-06** `requireAdmin` role separation
5. **SEC-06 / H-A03** Server-side admin gate
6. **SEC-07 / H-D02** Upload content sniffing
7. **SEC-08 / H-D03** AuditLog immutability
8. **SEC-09 / H-D01** CHECK constraints
9. **SEC-10 / H-M02** Centralised bcrypt helper (cost 12)
10. **SEC-12** Password re-verification on email change

### Phase 2 — Order & data integrity (11 d)
> Goal: checkout cannot be cheated; data is consistent.
1. **C-03 / BUG-C02** Server-authoritative shipping (read from Setting)
2. **C-04 / BUG-C03** Transactional stock check
3. **H-A05 / BUG-H15** Order state machine
4. **H-A06 / BUG-L01** `REFUNDED` status UI + logic
5. **H-S04 / BUG-H11** Reconcile image storage
6. **H-S02** Wire server cart API
7. **H-S07 / BUG-H04** Cart wishlist-button fix
8. **H-S08 / BUG-M02** Cart badge global sync
9. **TD-06** (already in Phase 0) — verify seed no longer clobbers
10. **M-A02 / API-M06** Settings UI + wire checkout to `shipping_fee`

### Phase 3 — Admin completeness (16 d)
> Goal: staff can run the store without DB access.
1. **H-A02 / FE-M01** Admin login screen
2. **H-A01 / ADM-01/02** Product edit + delete UI
3. **H-A04 / ADM-04** Pagination on all admin lists (PER-07)
4. **H-A07 / API-M07 / FE-M07** AuditLog viewer
5. **M-A01 / ADM-08** Customer create/edit/role
6. **M-A02 / ADM-09** Settings management UI (pairs with Phase 2 #10)
7. **M-A03 / API-M09 / ADM-10** Stock adjustment (writes StockMovement)
8. **M-A04 / API-M08 / ADM-11** Order timeline UI

### Phase 4 — Storefront mobile + UX (13 d)
> Goal: the site is usable on a phone.
1. **C-09 / BUG-H01** Mobile hamburger menu
2. **H-S06 / TD-01/18** Install Tailwind via build
3. **H-S01 / BUG-H02** Wire dead `href="#"` links
4. **H-S03 / BUG-H05** Wire colour/unit filters
5. **H-S05 / BUG-H08** Migrate siloed catalog pages to DB
6. **M-S01** Mini-cart drawer
7. **M-S04 / BUG-H10 / TD-17** Wire/remove orphan pages
8. **M-S06 / BUG-H06/M04** Rename PDP to `/product/[slug]`
9. **L-12 / BUG-M03** Replace `document.write` catalog fallback
10. **L-13 / BUG-M12** Dark-mode localStorage persistence

### Phase 5 — Internationalisation + SEO (22 d)
> Goal: the site speaks Arabic and is discoverable.
1. **H-P03** i18n framework setup (next-intl)
2. **H-P02 / BUG-H12** Arabic strings + RTL layout (`<html dir="rtl" lang="ar">`)
3. **SEO-01/02/09** Per-page title + meta + meaningful H1
4. **SEO-03/04/05** OpenGraph + Twitter + canonical
5. **SEO-06/07** robots.txt + sitemap.xml (API-M12)
6. **SEO-08** JSON-LD (Product, Organization, BreadcrumbList)
7. **H-SE05 / SEO-10** Server-render product content

### Phase 6 — Payments + customer features (20 d)
> Goal: the site can take money and serve returning customers.
1. **H-P01 / API-M11 / DB-M01** Payment gateway (KNET/Stripe/Tap)
2. **H-M01 / M-O03** Transactional email provider
3. **M-C02 / API-M01 / FE-M02/M03** Password reset
4. **M-C03 / API-M02 / FE-M04** Email verification
5. **M-C01 / API-M03 / FE-M05** Saved addresses
6. **M-C04 / API-M04/M05 / FE-M06** Order detail + reorder

### Phase 7 — Performance + observability (8 d)
> Goal: the site is fast and observable.
1. **PER-01** Catalog caching
2. **PER-02/03/04 / DB-M08/M09/M10** GIN + trigram + composite indexes
3. **PER-05** `next/image`
4. **PER-06** Session pruning job
5. **PER-08** Lazy-load images
6. **M-O01** Structured logging (pino)
7. **M-O02** Error tracking (Sentry)

### Phase 8 — Quality + CI (15 d)
> Goal: regressions are caught automatically.
1. **M-E01 / TD-03** ESLint + Prettier + shared response/validation helpers
2. **TD-04** Remove unsafe casts
3. **M-E02** API route tests (Vitest)
4. **M-E03** Playwright E2E tests
5. **M-E04 / DEP-08** CI pipeline

### Phase 9 — Polish + debt (20 d, parallelisable)
1. **L-01–L-14** as prioritised by team
2. **TD-07 / L-14** Down-migration strategy
3. **L-06 / TD-13** Remove `rackingpage/` + `code backup/`
4. **L-08 / TD-15/16** Dead-code removal
5. **SEC-11 / L-10** Security headers (CSP/HSTS)
6. **L-11 / DEP-09** Backup strategy
7. **DEP-13/14** Deployment docs + README

---

## 15. Milestones

Six release-grade milestones, each independently shippable.

### 🚩 M0 — "Safe to develop on" (Phase 0 + 1)
**~14 d cumulative.** Secrets rotated, dedicated DB role, rate limiting, CSRF,
role separation, slug data fixed, dummy cart gone, brand leakage fixed.

**Exit criteria:**
- No secret in `.env` is default/weak.
- Login is rate-limited; STAFF ≠ ADMIN.
- All `Category.slug` values match `^[a-z0-9-]+$`.
- Fresh visitor sees an empty cart.
- No page carries a non-AL-NASSIM brand.

### 🚩 M1 — "Honest checkout" (Phase 2)
**~25 d cumulative.** Order totals are server-authoritative, stock cannot be
oversold, cart syncs to server. The store can be trusted with real COD orders.

**Exit criteria:**
- `Order.shipping` read from `Setting.shipping_fee`.
- Stock check + decrement in same transaction.
- Admin can move orders through a validated state machine.
- Single source of truth for product images.

### 🚩 M2 — "Operable admin" (Phase 3)
**~41 d cumulative.** Staff can fully run the store from the admin UI without
touching the DB.

**Exit criteria:**
- Admin login screen exists; server-side gate via middleware.
- Product edit + delete UI works.
- All admin lists paginate.
- AuditLog viewer available.
- Settings UI controls `shipping_fee` (read by checkout).

### 🚩 M3 — "Mobile-ready storefront" (Phase 4)
**~54 d cumulative.** Site usable on phones, Tailwind built (not CDN), dead
links wired, PDP has clean URL. **Minimum viable public launch** (EN, COD).

**Exit criteria:**
- Hamburger menu works at ≤768px; all categories reachable.
- No Tailwind CDN warning in console.
- No `href="#"` in primary navigation.
- `/product/[slug]` replaces `product view.html`.

### 🚩 M4 — "Market-ready" (Phase 5 + 6)
**~96 d cumulative.** Arabic/RTL works, SEO in place, online payments live,
customers can reset passwords + save addresses. **Production launch** (Kuwait).

**Exit criteria:**
- `<html dir="rtl" lang="ar">` toggles correctly; all visible strings translated.
- Payment gateway processes a test txn end-to-end.
- Order confirmation emails send.
- `sitemap.xml` generated; product pages have meta + JSON-LD.
- Google Rich Results Test passes for a product URL.

### 🚩 M5 — "Production-hardened" (Phase 7 + 8)
**~119 d cumulative.** Site is fast, observable, tested. CI prevents
regressions. **Post-launch hardening** for sustainable operation.

**Exit criteria:**
- Lighthouse performance ≥ 80 on key pages.
- Catalog endpoints cached; GIN indexes on tags/specs.
- Structured logs ship to a sink; Sentry captures errors.
- API test coverage ≥ 70%; E2E covers browse→checkout.
- CI runs on every PR.

Phase 9 (polish) is ongoing, no fixed exit.

---

## 16. Sprint plan

Assumes **2-week sprints**, **1–3 engineers**. Each sprint ships a demoable
increment. Capacity: ~8 productive engineer-days per engineer per sprint
(after meetings/overhead).

### Sprint 0 — Stabilise (1 engineer × 1 sprint = 8 d; Phase 0 = 4 d, buffer 4 d) ✅ COMPLETED 2026-07-21
- ✅ SEC-01/C-01 Rotate secrets (0.5 d)
- ✅ SEC-02/C-12 Dedicated DB role (1 d)
- ✅ TD-10, TD-12, L-07 Repo hygiene (1 d)
- ✅ C-08 Slug cleanup + seed routing (1 d)
- ✅ TD-06 Seed idempotency (0.5 d)
- ✅ C-10 Remove dummy cart (0.5 d)
- ✅ C-11 Brand leakage fix (0.5 d)
- ✅ M-S05 Logo redirect (0.1 d)
- ✅ M-S02 Favicon (0.25 d)
- ✅ **Buffer / smoke tests** (2.65 d → Playwright smoke tests pass; typecheck + build clean)

**Demo:** clean repo, no embarrassing bugs, fresh visitor sees correct cart. ✅

### Sprint 1 — Security foundation (1 engineer × 1 sprint = 8 d)
- DEP-05 `middleware.ts` skeleton (1 d)
- SEC-03 Rate limiting (2 d)
- SEC-04 CSRF (1.5 d)
- SEC-05 `requireAdmin` (1.5 d)
- SEC-06 Server admin gate (1 d)
- SEC-12 Password re-verify (0.5 d)
- Tests for auth changes (0.5 d)

**Demo:** login is rate-limited; STAFF cannot do admin operations; middleware
enforces gate.

### Sprint 2 — Order integrity (1 engineer × 1 sprint = 8 d)
- C-03 Server-authoritative shipping (1.5 d)
- C-04 Transactional stock (1 d)
- H-A05 Order state machine (1.5 d)
- H-A06 REFUNDED UI (0.5 d)
- H-S04 Reconcile image storage (2 d)
- H-S07 Cart wishlist-button (0.5 d)
- Tests: checkout + stock regression (1 d)

**Demo:** cannot cheat shipping; stock cannot oversell; orders follow state machine.

### Sprint 3 — Admin core (1 engineer × 1 sprint = 8 d) — *can run in parallel with Sprint 4 if 2 engineers*
- H-A02 Admin login screen (2 d)
- H-A01 Product edit + delete UI (3 d)
- H-A04 Pagination (2 d)
- Tests: admin CRUD (1 d)

**Demo:** staff log in separately; can edit/delete products; lists paginate.

### Sprint 4 — Storefront mobile (1 engineer × 1 sprint = 8 d) — *parallel with Sprint 3*
- C-09 Hamburger menu (2 d)
- H-S06 Tailwind build (1.5 d)
- H-S01 Wire dead links (1.5 d)
- H-S03 Wire filters (1 d)
- H-S05 Migrate siloed catalogs (2 d)

**Demo:** site works on iPhone; no CDN warning; filters work.

### Sprint 5 — Admin completeness (1 engineer × 1 sprint = 8 d)
- H-A07 AuditLog viewer (2 d)
- M-A01 Customer CRUD (2 d)
- M-A02 Settings UI (1.5 d)
- M-A03 Stock adjustment (2 d)
- M-A04 Order timeline (0.5 d)

**Demo:** full admin operability; audit trail visible.

### Sprint 6 — i18n foundation (1 engineer × 1 sprint = 8 d)
- H-P03 i18n framework (3 d)
- H-P02 Arabic strings + RTL (5 d of 10) — continues into Sprint 7

**Demo:** EN/AR toggle works for header + homepage.

### Sprint 7 — Arabic completion + SEO (1 engineer × 1 sprint = 8 d)
- H-P02 Arabic (remaining 5 d)
- SEO-01/02/09 Title + meta + H1 (1 d)
- SEO-03/04/05 OG + Twitter + canonical (1 d)
- SEO-06/07 robots + sitemap (1 d)

**Demo:** full Arabic UI; sitemap.xml live; meta tags on every page.

### Sprint 8 — Payments + email (2 engineers × 1 sprint = 16 d)
- *Engineer A:* H-P01 Payment gateway (8 d)
- *Engineer B:* H-M01/M-O03 Transactional email (3 d) + M-C02 Password reset (3 d) + M-C03 Email verification (2 d)

**Demo:** test card payment succeeds; confirmation email arrives; password reset works.

### Sprint 9 — Customer account + SEO completion (2 engineers × 1 sprint = 16 d)
- *Engineer A:* M-C01 Saved addresses (2 d) + M-C04 Order detail + reorder (2 d) + H-SE05 Server-render products (3 d) + SEO-08 JSON-LD (1 d)
- *Engineer B:* Performance: PER-01 (1.5 d) + PER-02/03/04 (2 d) + PER-05 (2 d) + PER-06 (0.5 d) + M-O01 Logging (1.5 d) + M-O02 Sentry (1 d) + PER-10 Lighthouse (0.5 d)

**Demo:** addresses save; order history works; Lighthouse ≥ 80; Sentry captures a test error.

### Sprint 10 — Test + CI (1–2 engineers × 1 sprint = 12–16 d)
- M-E01 ESLint + Prettier + shared helpers (2 d)
- TD-04 Remove casts (1 d)
- M-E02 API tests (5 d)
- M-E03 E2E tests (4 d)
- M-E04 CI (1.5 d)

**Demo:** CI green on a PR; coverage report; E2E passes.

### Sprint 11+ — Polish (ongoing, parallelisable)
- L-01–L-14, SEC-11/13/14/15, DEP-09/11/13/14, TD-07

### Sprint capacity summary

| Sprint | Engineers | Days | Phase |
|---|:-:|:-:|---|
| 0 | 1 | 8 | Phase 0 |
| 1 | 1 | 8 | Phase 1 (part) |
| 2 | 1 | 8 | Phase 1 (rest) + Phase 2 |
| 3 | 1 | 8 | Phase 3 (part) — *parallel w/ 4* |
| 4 | 1 | 8 | Phase 4 — *parallel w/ 3* |
| 5 | 1 | 8 | Phase 3 (rest) + Phase 4 (rest) |
| 6 | 1 | 8 | Phase 5 (i18n start) |
| 7 | 1 | 8 | Phase 5 (Arabic + SEO) |
| 8 | 2 | 16 | Phase 6 (payments + email) |
| 9 | 2 | 16 | Phase 6 (rest) + Phase 7 |
| 10 | 1–2 | 12–16 | Phase 8 (tests + CI) |
| 11+ | 1 | ongoing | Phase 9 (polish) |

**Total: ~10–11 sprints (~20–22 weeks) with 1 engineer; ~8–9 sprints (~16–18 weeks) with 2 engineers in Sprints 3–10.**

---

## 17. Estimated effort per milestone

| Milestone | Theme | Effort | Cumulative | Min. elapsed (1 eng) | Min. elapsed (2 eng) |
|---|---|---:|---:|---:|---:|
| **M0** | Safe to develop | 14 d | 14 d | 2 sprints (4 wks) | 1 sprint (2 wks) |
| **M1** | Honest checkout | 11 d | 25 d | 3 sprints (6 wks) | 2 sprints (4 wks) |
| **M2** | Operable admin | 16 d | 41 d | 5 sprints (10 wks) | 3 sprints (6 wks) |
| **M3** | Mobile-ready storefront | 13 d | 54 d | 7 sprints (14 wks) | 4 sprints (8 wks) |
| **M4** | Market-ready (launch) | 42 d | 96 d | 12 sprints (24 wks) | 8 sprints (16 wks) |
| **M5** | Production-hardened | 23 d | 119 d | 15 sprints (30 wks) | 10 sprints (20 wks) |
| Phase 9 | Polish | 20 d | 139 d | ongoing | ongoing |

**Headline numbers:**
- **~139 engineer-days total** (~7 months solo; ~5 months with 2 engineers).
- **Critical path to launch (M4): ~96 d solo / ~16 weeks with 2 engineers.**
- **Critical path to hardened (M5): ~119 d solo / ~20 weeks with 2 engineers.**

---

## 18. Independent vs dependent features

### 18.1 Features that can be developed independently (no shared state, parallelisable)

These can be picked up by different engineers in the same sprint without
merge conflicts:

| ID | Feature | Why independent |
|---|---|---|
| **C-08** | Slug cleanup | DB-only, no app code |
| **C-10** | Remove dummy cart | Single HTML file |
| **C-11** | Brand leakage fix | 3 isolated HTML files |
| **H-A07** | AuditLog viewer | New admin page + read-only API |
| **H-S01** | Wire dead links | HTML edits only |
| **H-S06** | Tailwind build | Build config + CSS extraction |
| **M-A02** | Settings UI | New admin page + new API |
| **M-A03** | Stock adjustment UI | New admin page + new API + unused table |
| **M-A04** | Order timeline UI | New admin section reading existing data |
| **M-C01** | Saved addresses | New model API + new UI; no existing code touched |
| **M-O01** | Structured logging | Cross-cutting but additive (no behaviour change) |
| **M-O02** | Sentry | Additive wrapper |
| **M-E01** | ESLint + Prettier | Config-only |
| **L-04** | Analytics | Additive script tag |
| **L-06** | Remove `rackingpage/`/`code backup/` | Pure deletion |
| **L-08** | Dead-code removal | Isolated symbols |
| **PER-05** | `next/image` | Per-component refactor |
| **PER-06** | Session pruning | New scheduled job |

### 18.2 Features that depend on others (must be sequenced)

| Feature | Depends on | Why |
|---|---|---|
| **M-C02 Password reset** | **H-M01 transactional email** | Reset link delivered by email |
| **M-C03 Email verification** | **H-M01** | Verification link delivered by email |
| **M-A02 Settings UI** | **API-M06 settings API** | UI calls the API |
| **C-03 Server shipping** | **M-A02 / Setting table read** | Reads `shipping_fee` from Setting |
| **H-P02 Arabic/RTL** | **H-P03 i18n framework** | Strings need a framework |
| **SEO-08 JSON-LD** | **H-SE05 server-render products** | Structured data needs server HTML |
| **M-C04 Order detail** | **API-M04 order detail endpoint** | UI calls the API |
| **ADM-10 Stock adjustment** | **API-M09 + StockMovement wiring** | UI writes via API to unused table |
| **PER-01 Catalog caching** | **H-S05 migrate siloed catalogs** | Cache invalidation needs single source |
| **SEC-03 Rate limiting** | **DEP-05 middleware.ts** | Rate limit lives in middleware |
| **SEC-06 Admin gate** | **DEP-05** | Gate lives in middleware |
| **C-04 Stock txn** | **C-03** (same order-creation code path) | Both edit `orders/route.ts` |
| **L-01 Multi-currency** | **TD-19 `fmt()` refactor** | Display helper must be currency-aware |
| **H-P01 Payment** | **C-03/C-04 order integrity** | Payments need correct totals first |

---

## 19. Dependency graph

```
Phase 0 (Stabilise) ────────────────────────────────────────────────
  │
  ▼
Phase 1 (Security) ─── DEP-05 middleware.ts ──┐
  │                                            ├──► SEC-03 rate limit
  │                                            └──► SEC-06 admin gate
  ▼
Phase 2 (Order integrity) ── C-03 shipping ──► C-04 stock txn
  │                          └── M-A02 Settings ──► checkout reads setting
  ▼
Phase 3 (Admin) ─────── H-A02 login ──► H-A01 product edit/delete
  │                     └── H-A04 pagination (independent)
  │                     └── H-A07 audit viewer (independent)
  ▼
Phase 4 (Storefront) ── C-09 hamburger (independent)
  │                     └── H-S06 Tailwind build (independent)
  │                     └── H-S05 migrate siloed catalogs ──► PER-01 caching
  ▼
Phase 5 (i18n + SEO) ── H-P03 i18n framework ──► H-P02 Arabic/RTL
  │                     └── H-SE05 server-render ──► SEO-08 JSON-LD
  ▼
Phase 6 (Payments) ──── C-03/C-04 (integrity) ──► H-P01 payment gateway
  │                     └── H-M01 email ──► M-C02 password reset
  │                                    └─► M-C03 email verification
  ▼
Phase 7 (Perf) ──────── H-S05 (single catalog) ──► PER-01 caching
  │                     └── indexes (independent)
  ▼
Phase 8 (Tests + CI) ── all prior features stable ──► E2E tests meaningful
  │
  ▼
Phase 9 (Polish) ────── ongoing, parallelisable
```

**Critical path (longest dependency chain):**
`Phase 0 → Phase 1 → Phase 2 → Phase 6 (payments, needs integrity) → M4 launch`
= **~96 d solo, ~16 weeks with 2 engineers.**

**Parallelisation lanes (independent, can run concurrently):**
- Lane A (admin): Phase 3
- Lane B (storefront): Phase 4
- Lane C (i18n/SEO): Phase 5
- Lane D (infra): Phase 7 + Phase 8 tests

With **4 engineers**, one per lane, Phases 3/4/5/7+8 run concurrently after
Phase 2, compressing M4 to **~10–12 weeks**.

---

## 20. Final production checklist

Every item must be ✅ before flipping the production switch. Items are
grouped by milestone exit criteria; the milestone gate cannot close until
its group is green.

### M0 — Safe to develop (Phase 0+1)
- [x] No secret in `.env` is default or weak (SEC-01) — ✅ Sprint 0
- [x] App connects via dedicated non-superuser role to dedicated DB (SEC-02) — ✅ Sprint 0
- [ ] Login + register rate-limited (SEC-03) — Sprint 1
- [ ] CSRF tokens issued + validated on mutations (SEC-04) — Sprint 1
- [ ] `requireAdmin` exists; STAFF cannot perform admin-only ops (SEC-05) — Sprint 1
- [ ] `middleware.ts` enforces admin route gate server-side (SEC-06) — Sprint 1
- [x] All `Category.slug` values match `^[a-z0-9-]+$` (C-08) — ✅ Sprint 0
- [x] Warehouse department has its categories (seed routing fixed) — ✅ Sprint 0
- [x] Fresh visitor sees an empty cart (no dummy items) (C-10) — ✅ Sprint 0
- [x] No page title/footer carries a non-AL-NASSIM brand (C-11) — ✅ Sprint 0
- [x] Logo links directly to `/` (no redirect bounce) (M-S05) — ✅ Sprint 0
- [x] Favicon served (no 404) (M-S02) — ✅ Sprint 0

### M1 — Honest checkout (Phase 2)
- [ ] `Order.shipping` read from `Setting.shipping_fee` server-side (C-03)
- [ ] Stock check + decrement in same DB transaction (C-04)
- [ ] Order status transitions validated by state machine (H-A05)
- [ ] `REFUNDED` status reachable from admin UI (H-A06)
- [ ] Single source of truth for product images (H-S04)
- [ ] Server cart API used by storefront for logged-in users (H-S02)
- [ ] Cart "wishlist" button moves item to wishlist (H-S07)
- [ ] Cart badge updates on every page (H-S08)
- [ ] Seed no longer overwrites admin edits on re-run (TD-06)

### M2 — Operable admin (Phase 3)
- [ ] Admin login screen exists at `/admin/login` (H-A02)
- [ ] Product edit + delete buttons work in admin UI (H-A01)
- [ ] All admin lists paginate (H-A04)
- [ ] AuditLog viewer searchable in admin (H-A07)
- [ ] Customer create/edit/role-change available (M-A01)
- [ ] Settings UI edits `shipping_fee`, checkout reads it (M-A02)
- [ ] Stock adjustment UI writes `StockMovement` rows (M-A03)
- [ ] Order timeline UI shows `OrderStatusEvent` history (M-A04)

### M3 — Mobile-ready storefront (Phase 4)
- [ ] Hamburger menu works at ≤768px; all categories reachable (C-09)
- [ ] Tailwind compiled at build time (no Play CDN warning) (H-S06)
- [ ] No `href="#"` in primary navigation (H-S01)
- [ ] Colour/unit filters function on category pages (H-S03)
- [ ] All category pages read from DB (no inline arrays) (H-S05)
- [ ] `/product/[slug]` Next.js route replaces `product view.html` (M-S06)
- [ ] Mini-cart drawer works from any page (M-S01)
- [ ] Orphan pages wired or removed (M-S04)
- [ ] Lighthouse mobile usability ≥ 90

### M4 — Market-ready (Phase 5+6) — **LAUNCH GATE**
- [ ] `<html dir="rtl" lang="ar">` toggles correctly (H-P02)
- [ ] All visible user-facing strings translated to Arabic (H-P02)
- [ ] EN/AR switch persists preference + updates layout (H-P02)
- [ ] Payment gateway processes a sandbox txn end-to-end (H-P01)
- [ ] Payment webhook updates order status (H-P01)
- [ ] Order confirmation email sends (H-M01)
- [ ] Order status-update emails send (H-M01)
- [ ] Password reset flow works end-to-end (M-C02)
- [ ] Email verification works (M-C03)
- [ ] Saved addresses CRUD works (M-C01)
- [ ] Order detail + reorder work (M-C04)
- [ ] Every page has meaningful `<title>` + meta description (SEO-01/02)
- [ ] OpenGraph + Twitter cards on every page (SEO-03/04)
- [ ] `sitemap.xml` + `robots.txt` served (SEO-06/07)
- [ ] JSON-LD on product + organization pages (SEO-08)
- [ ] Google Rich Results Test passes for a product URL (SEO-08)
- [ ] Product content server-rendered (not JS-injected) (H-SE05)

### M5 — Production-hardened (Phase 7+8)
- [ ] Lighthouse performance ≥ 80 on key pages (PER-10)
- [ ] Public catalog endpoints cached (PER-01)
- [ ] GIN indexes on `Product.tags` + `Product.specs` (PER-02)
- [ ] Trigram index for search (PER-03)
- [ ] Composite indexes on hot filters (PER-04)
- [ ] `next/image` used for all storefront images (PER-05)
- [ ] Expired sessions pruned on schedule (PER-06)
- [ ] Structured logs shipping to a sink (M-O01)
- [ ] Sentry capturing errors (M-O02)
- [ ] API route test coverage ≥ 70% (M-E02)
- [ ] E2E covers browse→cart→checkout + admin CRUD (M-E03)
- [ ] CI runs typecheck + lint + test + migrate check on every PR (M-E04)

### Cross-cutting (always required)
- [ ] `.env.example` documents all required vars; no real secrets in repo
- [ ] `README.md` exists with setup/run/deploy instructions
- [ ] Deployment docs written (DEP-13)
- [ ] Backup strategy documented + tested (DEP-09)
- [ ] Health-check endpoint responds 200 (DEP-11)
- [ ] CSP + HSTS + Permissions-Policy headers set (SEC-11)
- [ ] No `console.log` in production build (M-O01)
- [ ] All §3 critical + high bugs have regression tests
- [ ] `prisma migrate status` reports no drift
- [ ] `npm run typecheck` passes clean
- [ ] `npm run build` succeeds
- [ ] Mozilla Observatory grade ≥ B

---

## Appendix — Item-ID index

Every action item in this plan carries a stable ID for tracking. Quick
mapping to source documents:

| ID prefix | Domain | Count | Source |
|---|---|---:|---|
| C- | Critical feature/blocker | 12 | Roadmap §2 |
| H- | High feature (A=admin, S=storefront, P=payments/i18n, SE=SEO, D=db, M=misc) | 28 | Roadmap §3 |
| M- | Medium feature (PER, C, A, S, E, O) | 27 | Roadmap §4 |
| L- | Low feature | 14 | Roadmap §5 |
| BUG- | Bug (C/H/M/L severity) | 43 | PA §3–§7, AO §7, DA §16, UA §16 |
| API- | API endpoint (M=missing) | 12 missing + 9 gaps | AO §2, FM |
| FE- | Frontend page (M=missing) | 10 missing + many gaps | UA, FM |
| ADM- | Admin feature | 13 | FM §6, UA §14 |
| DB- | Database object (M=missing) | 13 | DA §7, §9 |
| TD- | Technical debt | 20 | PA §8, Roadmap §6 |
| SEC- | Security improvement | 17 | PA §3, DA §15 |
| PER- | Performance improvement | 12 | DA §13, UA §13 |
| SEO- | SEO improvement | 13 | UA §15 |
| DEP- | Deployment blocker | 14 | PA §3, TS §9 |

**Total tracked items: ~250.** All map back to specific file:line references
in the source audit documents.

---

*End of MASTER DEVELOVELOPMENT_PLAN.md. This document is the operating
plan; `Roadmap.md` remains as supporting detail. Re-baseline after each
milestone.*
