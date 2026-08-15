# MASTER DEVELOPMENT PLAN

> Project: **nassim-platform** (AL-NASSIM)
> Generated: 2026-07-21
> **Last revised: 2026-07-21 — business-model pivot (v2).**
> Sources of truth (read in full, not re-audited):
> `Project_Audit.md`, `Architecture.md`, `Current_Status.md`, `Technology_Stack.md`,
> `Database_Overview.md`, `Database_Audit.md`, `API_Overview.md`, `Folder_Structure.md`,
> `Feature_Matrix.md`, `UI_Audit.md`, `Roadmap.md` (≈33,000 words total).
> Method: **documentation only — no code was modified.**

---

> ## ⚠ BUSINESS-MODEL PIVOT (2026-07-21)
>
> **Nassim is NOT a traditional e-commerce platform.** It is an **ONLINE
> ORDERING SYSTEM** connected to an existing physical retail store with its
> own POS system.
>
> **The POS system remains responsible for:** billing, invoicing, stock
> management, inventory, refunds, and financial reporting.
>
> **The website is responsible only for:** product browsing, customer
> accounts, wishlist, cart, order placement, order communication,
> order tracking, and admin/staff order management.
>
> **Consequences for this plan:**
> - ❌ **Removed:** payment gateway, automatic stock deduction/reservation,
>   refund management, warehouse management, invoice generation, automatic
>   inventory synchronisation.
> - ✅ **Added:** order verification workflow, partial-availability handling,
>   customer confirmation flow, staff packing workflow, POS handoff status,
>   customer notifications at each step, order timeline.
>
> This pivot **reduces total development effort by ~30 engineer-days** and
> **raises overall completion from ~58% to ~65%** (the removed features no
> longer count against the gap). See the revised sections below.

---

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

> **Revised after business-model pivot.** Removing payment-gateway,
> automatic-stock, refund, and warehouse-management features from scope
> closes a large portion of the previous gap. Sprint 0 + Sprint 1 are
> complete, further raising the baseline.

| Layer | Completion | Gap to launch |
|---|---:|---:|
| Database / schema | **90%** | −10 pp |
| Backend / API | **85%** | −15 pp |
| Admin panel | **60%** | −40 pp |
| Storefront (user website) | **50%** | −50 pp |
| Security & DevOps | **45%** | −55 pp |
| **Overall** | **~65%** | **~35 pp** |

```
Database        ████████████████████░  90%
Backend / API   █████████████████░░░░  85%
Admin panel     ████████████░░░░░░░░░  60%
Storefront      ██████████░░░░░░░░░░░  50%
Security/DevOps █████████░░░░░░░░░░░░  45%
                                      ─────
Overall                               ~65%
```

**Distance to launch:** ~35 percentage points (was ~42 pp pre-pivot),
concentrated in the **order verification workflow**, mobile navigation,
i18n, SEO, and testing. Payment, stock, refund, and warehouse features
are **out of scope** — they belong to the POS system.

---

## 2. Remaining features by priority

Sourced from `Feature_Matrix.md` (90 features tracked), `Roadmap.md §2–§5`,
and `Current_Status.md §2`. Every item below is **not yet done**.

### 2.1 Critical (launch-gates)

> **Post-pivot:** C-03 (server-authoritative shipping) and C-04
> (transactional stock) are **removed** — the website does not manage stock
> or compute final billing. Order totals on the website are **indicative
> only**; the POS produces the authoritative invoice. Items C-01, C-02,
> C-05–C-12 are complete (Sprint 0 + Sprint 1). New critical items for the
> order verification workflow are added below.

| ID | Feature | Source | Status |
|---|---|---|---|
| **C-01** | Rotate committed secrets | PA §3.1 | ✅ Sprint 0 |
| **C-02** | Rate limiting on auth endpoints | PA §3.2 | ✅ Sprint 1 |
| ~~C-03~~ | ~~Server-authoritative order totals~~ | — | ❌ Removed (POS handles billing) |
| ~~C-04~~ | ~~Transactional stock check~~ | — | ❌ Removed (POS handles stock) |
| **C-05** | CSRF protection | PA §3.3 | ✅ Sprint 1 |
| **C-06** | ADMIN/STAFF role separation | PA §3.4 | ✅ Sprint 1 |
| **C-07** | Cloud storage for uploads | PA §3.5 | Pending |
| **C-08** | Fix `Category.slug` data | DA §3.3 | ✅ Sprint 0 |
| **C-09** | Mobile hamburger menu | UA §6.1 | Pending |
| **C-10** | Remove dummy cart contents | UA §4.3 | ✅ Sprint 0 |
| **C-11** | Fix template-brand leakage | UA §4.8 | ✅ Sprint 0 |
| **C-12** | Dedicated DB role + database | DA §15.1 | ✅ Sprint 0 |

**New critical items (order verification workflow):**

| ID | Feature | Effort |
|---|---|---:|
| **C-OW1** | **Order verification workflow** — staff reviews incoming orders against physical store availability; status moves PENDING → UNDER_REVIEW (new status) | 3 d |
| **C-OW2** | **Partial-availability handling** — staff marks individual line items as available/unavailable; customer sees the breakdown | 3 d |
| **C-OW3** | **Customer confirmation flow** — customer confirms "proceed with available items" or cancels; status READY_FOR_CONFIRMATION → CONFIRMED or CANCELLED | 3 d |
| **C-OW4** | **Customer notifications** at each workflow step (order received, under review, ready for confirmation, confirmed, packing, delivered) | 3 d |

**Remaining critical subtotal (post-pivot): ~17 d** (C-07, C-09, C-OW1–C-OW4)

### 2.2 High — 28 items

#### Admin (8)
| ID | Feature | Source | Effort | Status |
|---|---|---|---:|---|
| **H-A01** | Product edit + delete UI (API supports PATCH/DELETE; UI has no buttons) | PA §5 A1 | 3 d | Pending |
| **H-A02** | Dedicated admin login screen | PA §5 A2 | 2 d | Pending |
| **H-A03** | Server-side admin auth gate via `middleware.ts` | PA §5 A3 | 1.5 d | ✅ Sprint 1 |
| **H-A04** | Pagination on admin product/order/customer lists | AO §7 B4/B5 | 2 d | Pending |
| **H-A05** | **Order workflow state machine** — enforce valid transitions for the order lifecycle: PENDING→UNDER_REVIEW→READY_FOR_CONFIRMATION→CONFIRMED→PACKING→READY_FOR_DELIVERY→OUT_FOR_DELIVERY→DELIVERED→COMPLETED. Terminal/cancel states: CANCELLED_BY_CUSTOMER, CANCELLED_BY_STAFF. | AO §7 B3 | 2 d | Pending |
| ~~H-A06~~ | ~~`REFUNDED` status UI button~~ | — | — | ❌ Removed (POS handles refunds) |
| **H-A07** | AuditLog viewer (written by every mutation, no UI reads it) | FM §6.10 | 2 d | Pending |
| **H-A08** | **Admin order verification UI** — staff reviews orders, marks item availability, triggers customer confirmation | (new) | 3 d | Pending |
| **H-A09** | **Order timeline UI** — visual timeline of status events + staff/customer actions | (new) | 2 d | Pending |

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

#### Payments & i18n (2)
> **Post-pivot:** H-P01 (online payment gateway) is **removed** from scope —
> the website does not process payments. The POS handles all billing. If a
> future phase adds online payment as an optional convenience, it will be a
> separate initiative.

| ID | Feature | Source | Effort |
|---|---|---|---:|
| ~~H-P01~~ | ~~Online payment gateway~~ | — | ❌ Removed (POS handles billing) |
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
| **H-D01** | CHECK constraints (zero today; negative prices legal) | DA §5 | 1 d |
| **H-D02** | File-upload content sniffing (MIME client-trusted) | PA §3.5 | 1 d |
| **H-D03** | AuditLog immutability (revoke UPDATE/DELETE) | DA §15.5 | 0.5 d |

#### Misc (2)
| ID | Feature | Source | Effort | Status |
|---|---|---|---:|---|
| **H-M01** | Transactional email (order confirmations, status updates, availability notifications) — required by C-OW4, M-C02/M-C03 | FM §12.4 | 3 d | Pending |
| **H-M02** | Centralised bcrypt helper (cost 12) | DA §15.4 | 0.5 d | ✅ Sprint 1 |

**High subtotal (post-pivot): ~50 d** (was ~58 d; removed H-P01 payment gateway −8 d, H-A06 refunded −0.5 d; added H-A08 order verification +3 d, H-A09 timeline +2 d; marked H-A03/H-M02 done −2 d)

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

#### Admin completeness (3)
> **Post-pivot:** M-A03 (stock-adjustment UI) is **removed** — the website
> does not manage stock. M-A04 (order timeline UI) is promoted to H-A09
> (high priority, needed for the verification workflow).

| ID | Feature | Effort | Status |
|---|---|---:|---|
| **M-A01** | Customer create/edit/role-change | 2 d | Pending |
| **M-A02** | Settings management UI (order settings, notification templates) | 1.5 d | Pending |
| ~~M-A03~~ | ~~Stock-adjustment UI~~ | — | ❌ Removed (POS handles stock) |

#### Storefront polish (6)
| ID | Feature | Effort | Status |
|---|---|---:|---|
| **M-S01** | Mini-cart drawer (slide-out from any page) | 2 d | Pending |
| **M-S02** | Favicon (currently 404) | 0.25 d | ✅ Sprint 0 |
| **M-S03** | Faceted filtering (brand/material/tag) with endpoint | 3 d | Pending |
| **M-S04** | Wire/remove orphan pages | 0.5 d | Pending |
| **M-S05** | Fix logo redirect | 0.1 d | ✅ Sprint 0 |
| **M-S06** | Rename PDP route (`product view.html` → `/product/[slug]`) | 1 d | Pending |

#### Order workflow — customer side (3, new)
> These support the customer-facing half of the verification workflow.

| ID | Feature | Effort |
|---|---|---:|
| **M-OW1** | **Customer order detail page** with item-level availability breakdown + confirm/modify/cancel actions | 3 d |
| **M-OW2** | **Customer notification inbox** (in-app) showing order status messages | 2 d |
| **M-OW3** | **Order tracking page** — customer-facing timeline mirroring H-A09 | 1.5 d |

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

**Medium subtotal (post-pivot): ~56 d** (removed M-A03 stock −2 d, M-A04 promoted to H-A09 −1 d; added M-OW1/2/3 +6.5 d)

### 2.4 Low — 14 items

| ID | Feature | Effort | Status |
|---|---|---:|---|
| **L-01** | Multi-currency support | 3 d | Pending |
| **L-02** | Product recommendations endpoint | 2 d | Pending |
| **L-03** | Loyalty / wallet features | 5 d | Pending |
| **L-04** | Analytics integration (GA/PostHog) | 1.5 d | Pending |
| **L-05** | GDPR account deletion / data export | 2 d | Pending |
| **L-06** | Remove `rackingpage/` prototype + `code backup/` | 0.5 d | Pending |
| **L-07** | Reconcile `AGENTS.md.txt` with actual stack | 0.5 d | ✅ Sprint 0 |
| **L-08** | Remove dead code | 1 d | Pending |
| **L-09** | Partial unique index for `Address.isDefault` | 0.25 d | Pending |
| **L-10** | Security headers (CSP, HSTS) — Permissions-Policy done Sprint 1 | 1 d | Pending |
| **L-11** | Database backup strategy + docs | 1 d | Pending |
| **L-12** | Replace `document.write` catalog fallback on PDP | 0.5 d | Pending |
| **L-13** | Persist dark-mode preference reliably in localStorage | 0.5 d | Pending |
| **L-14** | Make `down` migrations / rollback strategy | 2 d | Pending |
| **L-15** | **(Future-optional)** Online payment gateway as a convenience — explicitly out of scope for v1; the POS remains the billing system | 8 d | Future |

**Low subtotal (post-pivot): ~20 d** (L-15 is explicitly future-optional and not counted in the critical path)

---

## 3. Bugs by severity

Consolidated from `Project_Audit.md §3–§7`, `API_Overview.md §7`, `Database_Audit.md §16`, `UI_Audit.md §16`.

### 3.1 Critical bugs (data integrity / security)
| ID | Bug | Location | Status |
|---|---|---|---|
| **BUG-C01** | Secrets committed in `.env` | repo root | ✅ Fixed (Sprint 0) |
| **BUG-C02** | Order `shipping` trusted from client (0–100 arbitrary) | `app/api/orders/route.ts:85` | ⚠️ Low priority (website totals are indicative only; POS produces authoritative invoice) |
| ~~BUG-C03~~ | ~~Stock check outside transaction (race/oversell)~~ | — | ❌ N/A — website does not manage stock |
| **BUG-C04** | STAFF ≡ ADMIN (no `requireAdmin`) | `lib/auth.ts:66-70` | ✅ Fixed (Sprint 1) |
| **BUG-C05** | All 11 `Category.slug` contain spaces/`&` | live DB | ✅ Fixed (Sprint 0) |
| **BUG-C06** | Seed routes all categories to `houseware` | `prisma/seed.mjs` | ✅ Fixed (Sprint 0) |
| **BUG-C07** | Default cart ships dummy items | `public/cart.html` | ✅ Fixed (Sprint 0) |
| **BUG-C08** | 3 pages carry wrong brand names | (deleted files) | ✅ Fixed (Sprint 0) |
| **BUG-C09** | App connects as `postgres` superuser | `.env DATABASE_URL` | ✅ Fixed (Sprint 0) |

### 3.2 High bugs (functional / UX)
| ID | Bug | Location | Status |
|---|---|---|---|
| **BUG-H01** | No mobile hamburger menu | all storefront HTML | Pending (C-09) |
| **BUG-H02** | 33/49 homepage links are `href="#"` | storefront HTML | Pending (H-S01) |
| **BUG-H03** | No product edit/delete UI | `ProductsTab.tsx` | Pending (H-A01) |
| **BUG-H04** | Cart "wishlist" button only toggles icon | `cart.html` | Pending (H-S07) |
| **BUG-H05** | Colour/unit filters have no JS handler | `kitchenware.html` | Pending (H-S03) |
| **BUG-H06** | PDP requires `?id=slug` | `product view.html` | Pending (M-S06) |
| **BUG-H07** | Tailwind Play CDN warning | all HTML | Pending (H-S06) |
| **BUG-H08** | 3 siloed catalog pages drift from DB | `forklift/rack/trolly.html` | Pending (H-S05) |
| **BUG-H09** | Logo links to `/code.html` | (now `home.html`) | ✅ Fixed (Sprint 0) |
| **BUG-H10** | 5 orphan pages unreachable | (4 deleted Sprint 0) | ✅ Fixed (Sprint 0) |
| **BUG-H11** | Triple image storage drift | schema + storefront | Pending (H-S04) |
| **BUG-H12** | `EN \| AR` toggle is decorative | all HTML | Pending (H-P02) |
| **BUG-H13** | No admin login screen | `app/admin/` | Pending (H-A02) |
| **BUG-H14** | Admin auth gate client-side only | `AdminApp.tsx` | ✅ Fixed (Sprint 1 — middleware) |
| **BUG-H15** | No order state machine | `admin/orders/route.ts` | Pending (H-A05 — now the order-workflow state machine) |
| **BUG-H16** | No rate limiting on login/register | auth routes | ✅ Fixed (Sprint 1) |

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
| ID | Bug | Location | Status |
|---|---|---|---|
| ~~BUG-L01~~ | ~~`REFUNDED` status has no UI button~~ | — | ❌ N/A — POS handles refunds |
| ~~BUG-L02~~ | ~~Status enum sets inconsistent (REFUNDED)~~ | — | ❌ N/A — REFUNDED removed from website scope |
| **BUG-L03** | `fmt()` hardcodes 3-decimal KWD | `AdminApp.tsx:73` | Pending |
| **BUG-L04** | Admin orders GET caps `take:200` no pagination | `admin/orders/route.ts:69` | Pending |
| **BUG-L05** | Admin products GET returns all products no pagination | `admin/products/route.ts` | Pending |
| **BUG-L06** | Cart POST upsert replaces qty | `cart/route.ts:63` | Pending |
| **BUG-L07** | Revenue counts non-cancelled orders regardless of payment status | `admin/stats/route.ts` | ⚠️ Lower priority — POS produces financial reports; this dashboard figure is indicative only |
| **BUG-L08** | `Order.orderNumber` unique index never scanned | `Order_orderNumber_key` | Pending |
| **BUG-L09** | Force-dynamic on public catalog routes (no caching) | catalog routes | Pending |
| **BUG-L10** | `BARCODE` index never scanned | `Product_barcode_idx` | Pending |

---

## 4. Incomplete APIs

From `API_Overview.md §2` and `Feature_Matrix.md §1–§7`.

### 4.1 Missing endpoints (entire routes)
> **Post-pivot:** API-M09 (stock adjustment) and API-M11 (payment) are
> **removed**. New order-workflow endpoints are added.

| ID | Endpoint | Purpose | Depends on |
|---|---|---|---|
| **API-M01** | `POST /api/auth/password-reset/request` + `/reset` | Forgot-password flow | H-M01 (email) |
| **API-M02** | `GET /api/auth/verify-email` | Email verification | H-M01 |
| **API-M03** | `GET/POST/PATCH/DELETE /api/addresses` | Saved-address CRUD | — |
| **API-M04** | `GET /api/orders/[id]` | Order detail (for M-C04, M-OW1) | — |
| **API-M05** | `POST /api/orders/[id]/reorder` | Reorder past order | API-M04 |
| **API-M06** | `GET/POST/PATCH/DELETE /api/admin/settings` | Settings management | — |
| **API-M07** | `GET /api/admin/audit-log` | AuditLog viewer | — |
| **API-M08** | `GET /api/admin/orders/[id]/timeline` | Order status timeline | — |
| ~~API-M09~~ | ~~`POST /api/admin/products/[id]/stock`~~ | ~~Stock adjustment~~ | ❌ Removed (POS handles stock) |
| **API-M10** | `GET /api/products/facets` | Faceted filtering (brand/material/tag) | — |
| ~~API-M11~~ | ~~`POST /api/payments/intent`~~ | ~~Payment gateway~~ | ❌ Removed (POS handles billing) |
| **API-M12** | `GET /api/sitemap.xml` + `/robots.txt` (or static) | SEO | — |
| **API-OW1** | `PATCH /api/admin/orders/[id]/verify` | Staff submits item-availability check (marks each item AVAILABLE/UNAVAILABLE) | — |
| **API-OW2** | `POST /api/orders/[id]/confirm` | Customer confirms "proceed with available items" or cancels | API-OW1 |
| **API-OW3** | `PATCH /api/admin/orders/[id]/pack` | Staff marks order as packed + POS handoff status | — |
| **API-OW4** | `GET /api/notifications` | Customer notification inbox | DB-M16 |
| **API-OW5** | `PATCH /api/admin/orders/[id]/pos-status` | Staff marks POS invoice created / handed to delivery | DB-M17 |

### 4.2 Existing endpoints with missing methods/bugs
| Endpoint | Gap |
|---|---|
| `GET /api/admin/orders` | No pagination (caps `take:200`) — BUG-L04 |
| `GET /api/admin/products` | No pagination — BUG-L05 |
| `PATCH /api/admin/orders` | No state machine — BUG-H15 |
| `PATCH /api/admin/customers/[id]` | No Zod — BUG-M07 |
| `DELETE /api/admin/hierarchy/[entity]` | Misclassifies P2025 as 409 — BUG-M08 |
| `POST /api/cart` | Replaces qty not increment (counter-intuitive for "add to cart") — BUG-L06, AO §7 B6 |
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

> **Post-pivot:** ADM-06 (REFUNDED button) and ADM-10 (stock adjustment)
> are **removed** — the POS handles refunds and stock. New order-workflow
> admin features are added.

| ID | Feature | Status | Effort |
|---|---|---|---:|
| **ADM-01** | Product **edit** UI | Missing | (in H-A01) |
| **ADM-02** | Product **delete** UI | Missing | (in H-A01) |
| **ADM-03** | Admin **login screen** | Missing | (in H-A02) |
| **ADM-04** | **Pagination** on all lists | Missing | (in H-A04) |
| **ADM-05** | **Order workflow state machine** | Missing | (in H-A05) |
| ~~ADM-06~~ | ~~`REFUNDED` button~~ | ❌ Removed | (POS handles refunds) |
| **ADM-07** | **AuditLog viewer** | Missing | (in H-A07) |
| **ADM-08** | Customer **create/edit/role-change** | Missing | (in M-A01) |
| **ADM-09** | **Settings** UI | Missing | (in M-A02) |
| ~~ADM-10~~ | ~~Stock adjustment UI~~ | ❌ Removed | (POS handles stock) |
| **ADM-11** | **Order timeline** UI | Missing | (in H-A09) |
| **ADM-12** | **Bulk operations** (product bulk edit/delete) | Missing | (future) |
| **ADM-13** | **2FA** for admin accounts | Missing | (future) |
| **ADM-14** | **Order verification UI** — staff reviews orders, marks item availability, triggers customer confirmation | Missing | (in H-A08) |
| **ADM-15** | **Packing workflow UI** — staff marks order as packed, ready for POS handoff/delivery | Missing | (new, 1.5 d) |
| **ADM-16** | **POS handoff status** — order marked as "invoice created in POS" / "handed to delivery" | Missing | (new, 1 d) |

**Completed admin modules** (credit): Master Data CRUD (12 entities), Hierarchy CRUD (4 entities), Dashboard/Stats, Image upload + media library, Customer activate/deactivate, Order status change, **edge auth gate** (Sprint 1).

### 6.1 Operational dashboard (replaces inventory dashboard)
> **Post-pivot:** The admin dashboard must reflect the **operational
> workflow**, not inventory or warehouse metrics. No stock widgets, no
> warehouse widgets, no revenue-as-truth widgets (revenue is the POS's
> domain — website figures are indicative only).

**Dashboard sections (operational):**
| Section | Content |
|---|---|
| Orders awaiting review | Count + list of PENDING / UNDER_REVIEW orders |
| Orders waiting customer confirmation | Count + list of READY_FOR_CONFIRMATION orders |
| Orders ready for packing | Count + list of CONFIRMED orders not yet packed |
| Orders ready for delivery | Count + list of READY_FOR_DELIVERY orders |
| Orders delivered today | Count + list |
| Orders completed today | Count + list |
| Cancelled orders (today) | Count + list (CANCELLED_BY_CUSTOMER + CANCELLED_BY_STAFF) |
| Customer messages / notifications | Recent unread notifications |

### 6.2 Operational reports (replaces inventory reports)
> Reports focus on **operational efficiency** and **customer ordering
> trends**, not inventory valuation or stock levels.

| Report | Description |
|---|---|
| Orders per day | Volume trend over time |
| Orders completed | Completion rate + count |
| Orders cancelled | Cancellation rate + reasons |
| Average confirmation time | Time from READY_FOR_CONFIRMATION to CONFIRMED |
| Average packing time | Time from CONFIRMED to READY_FOR_DELIVERY |
| Average delivery prep time | Time from READY_FOR_DELIVERY to OUT_FOR_DELIVERY |
| Most ordered products | By frequency, not by stock consumption |
| Customer ordering trends | Repeat order rate, average order size |
| Popular categories | By order volume |
| Staff workload | Orders processed per staff member |

---

## 7. Missing database implementations

From `Database_Audit.md §8, §9, §10, §15` and `Database_Overview.md §7`.

### 7.1 Tables defined but never written/read by code
> **Post-pivot:** `StockMovement` is **out of scope** — the website does
> not manage stock. It can remain in the schema for future use but no code
> path will write to it.

| Table | Status | Required action |
|---|---|---|
| ~~`StockMovement`~~ | Defined but **out of scope** (POS manages stock) | Keep schema for future; do not wire |
| `Address` | Defined, **no API** | Build API-M03 + FE-M05 |
| `ProductImage` | Admin writes, **storefront bypasses** | Reconcile via H-S04 |
| `Section` | Schema + admin CRUD, **0 rows, storefront ignores** | Surface on storefront OR document as future |
| `Subcategory` | Same as Section | Same |
| `CartItem` | Full API, **storefront uses localStorage** | Wire via H-S02 |
| `OrderStatusEvent` | Written on every change, **no UI reads it** | Build timeline API + ADM-11 |

### 7.2 Order lifecycle and item-status enums
> The full order lifecycle replaces the old e-commerce statuses. The website
> never owns stock, billing, or refunds — it orchestrates the human
> verification/confirmation/packing/delivery cycle. The POS handles billing,
> invoicing, refunds, and stock.

**OrderStatus (full lifecycle):**
```
PENDING → UNDER_REVIEW → READY_FOR_CONFIRMATION → CONFIRMED → PACKING → READY_FOR_DELIVERY → OUT_FOR_DELIVERY → DELIVERED → COMPLETED
                                                                                                              ↗
Terminal: CANCELLED_BY_CUSTOMER, CANCELLED_BY_STAFF
```
- ~~`REFUNDED`~~ — ❌ Out of scope (POS handles refunds)
- ~~`REJECTED`~~ — replaced by `CANCELLED_BY_STAFF`
- ~~generic `CANCELLED`~~ — split into `CANCELLED_BY_CUSTOMER` / `CANCELLED_BY_STAFF`
- **NEW values needed:** UNDER_REVIEW, READY_FOR_CONFIRMATION, READY_FOR_DELIVERY, CANCELLED_BY_CUSTOMER, CANCELLED_BY_STAFF

**OrderItem.availability (per-item status):**
| Value | Meaning |
|---|---|
| `PENDING` | Item ordered; not yet checked by staff |
| `AVAILABLE` | Staff confirmed the item is in the physical store |
| `UNAVAILABLE` | Staff confirmed the item is NOT in the physical store |
| `REMOVED_AFTER_CONFIRMATION` | Customer chose to remove this unavailable item and proceed with the rest |
| `DELIVERED` | Item was part of the delivered order |

**StockStatus:** Out of scope — POS manages stock. The field can remain for
display purposes but no code path sets it automatically.

### 7.3 Missing schema objects
| ID | Object | Purpose |
|---|---|---|
| ~~DB-M01~~ | ~~`Payment` / `PaymentMethod` tables~~ | ❌ Removed — POS handles billing |
| **DB-M02** | `PasswordResetToken` table (or columns on User) | M-C02 |
| **DB-M03** | `EmailVerificationToken` (or `User.emailVerifiedAt`) | M-C03 |
| ~~DB-M04~~ | ~~`Coupon` / `DiscountCode` tables~~ | ❌ Removed — POS handles discounts |
| **DB-M05** | `Tag` table + `ProductTag` join | Faceted tags (M-S03) |
| ~~DB-M06~~ | ~~`ShippingMethod` table~~ | ❌ Removed — website shipping is indicative; POS handles delivery logistics |
| **DB-M07** | CHECK constraints (prices ≥ 0, hex format) | H-D01 (stock checks removed) |
| **DB-M08** | GIN index on `Product.tags` + `Product.specs` | M-PER2 |
| **DB-M09** | Trigram index for ILIKE search (pg_trgm extension) | M-PER3 |
| **DB-M10** | Composite indexes (isActive+categoryId, userId+createdAt) | M-PER4 |
| **DB-M11** | Unique index on `Product.sku` | (optional) |
| **DB-M12** | Partial unique index `Address(userId) WHERE isDefault` | L-09 |
| ~~DB-M13~~ | ~~Foreign tables for shippingMethodId~~ | ❌ Removed |
| **DB-M14** | **`OrderItem.availability` enum** {PENDING, AVAILABLE, UNAVAILABLE, REMOVED_AFTER_CONFIRMATION, DELIVERED} | Per-item availability tracking in the verification workflow (replaces stock-based states) |
| **DB-M15** | **`Order.staffNotes` text** column | Staff notes during verification (what was checked, substitution offers) |
| **DB-M16** | **`Notification` table** (userId, orderId, type, message, readAt, createdAt) | Customer notification inbox for order-workflow messages |
| **DB-M17** | **`Order.posStatus` enum** {NOT_CREATED, INVOICED, HANDED_TO_DELIVERY} | POS handoff tracking — staff marks when the POS invoice is created and when products are handed to delivery |

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
| **DEP-12** | Order workflow (verification/confirmation flow) | Cannot process real orders until staff verification workflow is live | 3 d |
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
1. **Order placement:** browse → add to cart → checkout → POST `/api/orders` → order created with indicative totals (the POS produces the authoritative invoice later).
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

### Phase 2 — Order verification workflow + data cleanup (12 d)
> **Post-pivot:** This phase replaces "order integrity" (stock/shipping) with
> the **order verification workflow** — the core business logic of the
> platform. Stock deduction and server-authoritative shipping are removed
> (the POS handles those). The website's job is to capture the order,
> let staff verify availability against the physical store, let the customer
> confirm, and track the order through to delivery.

1. **H-A05** Order workflow state machine. The full lifecycle is: PENDING→UNDER_REVIEW→READY_FOR_CONFIRMATION→CONFIRMED→PACKING→READY_FOR_DELIVERY→OUT_FOR_DELIVERY→DELIVERED→COMPLETED. Terminal/cancel states: CANCELLED_BY_CUSTOMER, CANCELLED_BY_STAFF. Add new `OrderStatus` values via migration: UNDER_REVIEW, READY_FOR_CONFIRMATION, READY_FOR_DELIVERY, CANCELLED_BY_CUSTOMER, CANCELLED_BY_STAFF (replace generic CANCELLED/REJECTED).
2. **DB-M14** `OrderItem.availability` enum — per-item availability tracking
3. **DB-M17** `Order.posStatus` enum — POS handoff tracking
4. **C-OW1 / H-A08 / API-OW1** Staff order verification UI — staff reviews orders against physical store, marks each item AVAILABLE/UNAVAILABLE
5. **C-OW2** Partial-availability handling — customer sees the breakdown
6. **C-OW3 / API-OW2** Customer confirmation flow — customer confirms or cancels
7. **H-S04 / BUG-H11** Reconcile image storage (carry-over)
8. **H-S07 / BUG-H04** Cart wishlist-button fix (carry-over)
9. **H-S08 / BUG-M02** Cart badge global sync (carry-over)

### Phase 3 — Admin completeness (15 d)
> Goal: staff can run the store from the admin UI without DB access.
> **Post-pivot:** stock-adjustment (M-A03) removed; packing workflow +
> POS handoff + notification infrastructure added.

1. **H-A02 / FE-M01** Admin login screen
2. **H-A01 / ADM-01/02** Product edit + delete UI
3. **H-A04 / ADM-04** Pagination on all admin lists (PER-07)
4. **H-A07 / API-M07 / FE-M07** AuditLog viewer
5. **M-A01 / ADM-08** Customer create/edit/role
6. **M-A02 / ADM-09** Settings management UI
7. **ADM-15** Packing workflow UI (staff marks order packed)
8. **ADM-16 / API-OW5** POS handoff status (invoice created / handed to delivery)
9. **H-A09 / API-M08 / ADM-11** Order timeline UI
10. **H-M01 / M-O03** Transactional email + notification provider (order-workflow notifications)

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

### Phase 6 — Customer order experience + notifications (12 d)
> **Post-pivot:** payment gateway (H-P01) **removed** — the POS handles
> billing. Transactional email moved to Phase 3 (needed earlier for order
> notifications). This phase focuses on the customer-facing order
> experience: notifications, order tracking, confirmation, and account
> features.

1. **C-OW4 / API-OW4** Customer notification system (order received, under review, ready for confirmation, confirmed, packing, delivered) — in-app inbox + email
2. **DB-M16 / API-OW4** Notification table + endpoint
3. **M-OW1** Customer order detail page with item-level availability breakdown + confirm/modify/cancel
4. **M-OW3** Customer order tracking page (timeline)
5. **M-C02 / API-M01 / FE-M02/M03** Password reset
6. **M-C03 / API-M02 / FE-M04** Email verification
7. **M-C01 / API-M03 / FE-M05** Saved addresses
8. **M-C04 / API-M04/M05 / FE-M06** Order detail + reorder

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

### 🚩 M1 — "Order verification workflow" (Phase 2)
**~26 d cumulative.** The core business logic is live: customers place
orders, staff verify availability against the physical store, customers
confirm, and orders flow through a validated state machine. The website
does NOT manage stock or billing — it captures orders and orchestrates
the human verification/confirmation cycle.

**Exit criteria:**
- New `OrderStatus` values added via migration: UNDER_REVIEW, READY_FOR_CONFIRMATION, READY_FOR_DELIVERY, CANCELLED_BY_CUSTOMER, CANCELLED_BY_STAFF.
- `OrderItem.availability` enum tracks per-item availability.
- Staff can mark items available/unavailable in the admin UI.
- Customer can confirm "proceed with available items" or cancel.
- Order workflow state machine enforces valid transitions.
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
links wired, PDP has clean URL. **Minimum viable public launch** (EN, order-only).

**Exit criteria:**
- Hamburger menu works at ≤768px; all categories reachable.
- No Tailwind CDN warning in console.
- No `href="#"` in primary navigation.
- `/product/[slug]` replaces `product view.html`.

### 🚩 M4 — "Market-ready" (Phase 5 + 6)
**~88 d cumulative** (was ~96 d; payment gateway removed saves ~8 d).
Arabic/RTL works, SEO in place, order-workflow notifications live,
customers can track orders, reset passwords + save addresses.
**Production launch** (Kuwait). The website captures orders and orchestrates
the verification/confirmation cycle; the POS handles billing and stock.

**Exit criteria:**
- `<html dir="rtl" lang="ar">` toggles correctly; all visible strings translated.
- Order-workflow notifications send (email + in-app) at each step.
- Customer order tracking page shows live timeline.
- Customer can confirm/cancel from the order detail page.
- Password reset flow works end-to-end.
- Saved addresses CRUD works.
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

### Sprint 1 — Security foundation (1 engineer × 1 sprint = 8 d) ✅ COMPLETED 2026-07-21
- ✅ DEP-05 `middleware.ts` skeleton (1 d)
- ✅ SEC-03 Rate limiting (2 d)
- ✅ SEC-04 CSRF (1.5 d)
- ✅ SEC-05 `requireAdmin` (1.5 d)
- ✅ SEC-06 Server admin gate (1 d)
- ✅ SEC-12 Password re-verify (0.5 d)
- ✅ SEC-10 Centralised bcrypt (cost 12) + SEC-11 security headers + env validation

**Demo:** login is rate-limited; STAFF cannot do admin operations; middleware
enforces gate. ✅

### Sprint 2 — Order verification workflow (1 engineer × 1 sprint = 8 d)
> **Post-pivot:** replaces "order integrity" (stock/shipping). This is the
> core business logic: staff verifies availability, customer confirms.

- H-A05 Order workflow state machine + new OrderStatus values (UNDER_REVIEW, READY_FOR_CONFIRMATION, READY_FOR_DELIVERY, CANCELLED_BY_CUSTOMER, CANCELLED_BY_STAFF) via migration (2 d)
- DB-M14 OrderItem.availability enum + DB-M17 Order.posStatus enum (1 d)
- C-OW1 / H-A08 / API-OW1 Staff order verification UI (2 d)
- C-OW2 Partial-availability handling (1 d)
- C-OW3 / API-OW2 Customer confirmation flow (1 d)
- H-S04 Reconcile image storage (1 d, carry-over if time permits)

**Demo:** staff reviews an order, marks items available/unavailable, customer confirms, order flows through the state machine.

### Sprint 3 — Customer Experience (1 engineer × 1 sprint = 8 d) ✅ COMPLETED 2026-07-22
> **Note:** The actual Sprint 3 was "Customer Experience & Order Entry Foundation"
> (the business pivot reordered priorities from the original "Admin core" plan).
> Admin core work (H-A01/A02/A04) is deferred to Sprint 4.

- ✅ Fixed POST /api/orders 400 bug (Zod email validation for guests)
- ✅ Auth UX: guest mode returns 200 (no console errors)
- ✅ Guest checkout with Kuwait address fields
- ✅ Registered checkout with auto-populate + save address
- ✅ Cart merge (guest → account on login/signup)
- ✅ Wishlist guest popup
- ✅ Customer profile improvements (Track Order, Wishlist, order links)
- ✅ Addresses API (GET + POST)

**Demo:** guest places an order without an account; registered user logs in and cart merges; checkout form auto-populates. ✅

### Sprint 4+5 — Admin Operations + Storefront Polish (1 engineer × 1 sprint) ✅ COMPLETED 2026-07-22
> Combined Sprint 4+5. Partial completion — admin login, audit log, mobile
> nav, dead-link fix, and image lazy-loading delivered. Product edit/delete
> UI, Tailwind build migration, and catalog migration deferred to next sprint.

- ✅ H-A02 Admin login page (`/admin/login`) with dark UI + redirect-back
- ✅ H-A07 Audit log API + viewer with search, filter, pagination, CSV export
- ✅ C-09 Mobile hamburger menu on all 20 storefront pages
- ✅ H-S01 Fixed 180 dead `href="#"` mega-menu links
- ✅ PER-08 Lazy loading on 181 storefront images
- ⬜ H-A01 Product edit/delete/duplicate/bulk UI (deferred)
- ⬜ H-A04 Pagination on admin lists (deferred)
- ⬜ H-S06 Tailwind build migration (deferred — large effort)
- ⬜ H-S05 Migrate siloed catalog pages (deferred)

**Demo:** admin has dedicated login page; audit log is searchable/exportable; mobile hamburger menu works; no dead mega-menu links. ✅

### Sprint 5 — Admin completeness (1 engineer × 1 sprint = 8 d)
> **Post-pivot:** stock adjustment (M-A03) removed; packing workflow +
> POS handoff + transactional email added.

- H-A07 AuditLog viewer (2 d)
- M-A01 Customer CRUD (2 d)
- M-A02 Settings UI (1.5 d)
- ADM-15 Packing workflow UI (1.5 d)
- ADM-16 POS handoff status (1 d)

**Demo:** full admin operability; packing + POS handoff tracked; audit trail visible.

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

### Sprint 8 — Customer order experience + notifications (1–2 engineers × 1 sprint = 12 d)
> **Post-pivot:** payment gateway removed. Transactional email moved to
> Sprint 5 (needed for admin order notifications). This sprint focuses on
> the customer-facing order experience.

- C-OW4 / API-OW4 Customer notification system — in-app inbox + email at each workflow step (3 d)
- DB-M16 Notification table (1 d)
- M-OW1 Customer order detail page with availability breakdown + confirm/cancel (3 d)
- M-OW3 Customer order tracking page (1.5 d)
- M-C02 Password reset (3 d)
- M-C03 Email verification (0.5 d, if email provider from Sprint 5 is ready)

**Demo:** customer receives notifications, sees order timeline, confirms/cancels from the order page.

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

### Sprint capacity summary (post-pivot)

| Sprint | Engineers | Days | Phase |
|---|:-:|:-:|---|
| 0 | 1 | 8 | Phase 0 ✅ |
| 1 | 1 | 8 | Phase 1 ✅ |
| 2 | 1 | 8 | Phase 2 (order verification workflow) |
| 3 | 1 | 8 | Phase 3 (part) — *parallel w/ 4* |
| 4 | 1 | 8 | Phase 4 — *parallel w/ 3* |
| 5 | 1 | 8 | Phase 3 (rest) + Phase 4 (rest) |
| 6 | 1 | 8 | Phase 5 (i18n start) |
| 7 | 1 | 8 | Phase 5 (Arabic + SEO) |
| 8 | 1–2 | 12 | Phase 6 (customer order experience + notifications) |
| 9 | 2 | 16 | Phase 6 (rest) + Phase 7 |
| 10 | 1–2 | 12–16 | Phase 8 (tests + CI) |
| 11+ | 1 | ongoing | Phase 9 (polish) |

**Total (post-pivot): ~10–11 sprints (~18–20 weeks) with 1 engineer; ~7–8 sprints (~14–16 weeks) with 2 engineers.** (Was ~20–22 weeks solo / ~16–18 weeks with 2 engineers pre-pivot — saved ~2 weeks by removing payment gateway.)

---

## 17. Estimated effort per milestone

> **Post-pivot:** all figures revised. Payment gateway (~8 d), stock
> management (~3 d), and refund handling (~1 d) removed from scope;
> order verification workflow (~12 d), customer notifications (~5 d),
> packing/POS-handoff (~3 d) added. Net reduction: ~8 d on the critical path.

| Milestone | Theme | Effort | Cumulative | Min. elapsed (1 eng) | Min. elapsed (2 eng) |
|---|---|---:|---:|---:|---:|
| **M0** | Safe to develop | 14 d | 14 d | 2 sprints (4 wks) ✅ | 1 sprint (2 wks) ✅ |
| **M1** | Order verification workflow | 12 d | 26 d | 3 sprints (6 wks) | 2 sprints (4 wks) |
| **M2** | Operable admin | 15 d | 41 d | 5 sprints (10 wks) | 3 sprints (6 wks) |
| **M3** | Mobile-ready storefront | 13 d | 54 d | 7 sprints (14 wks) | 4 sprints (8 wks) |
| **M4** | Market-ready (launch) | 34 d | 88 d | 11 sprints (22 wks) | 7 sprints (14 wks) |
| **M5** | Production-hardened | 23 d | 111 d | 14 sprints (28 wks) | 9 sprints (18 wks) |
| Phase 9 | Polish | 20 d | 131 d | ongoing | ongoing |

**Headline numbers (post-pivot):**
- **~131 engineer-days total** (was ~139 d; saved ~8 d by removing payment/stock/refund).
- **Critical path to launch (M4): ~88 d solo / ~14 weeks with 2 engineers** (was ~96 d / ~16 wks).
- **Critical path to hardened (M5): ~111 d solo / ~18 weeks with 2 engineers** (was ~119 d / ~20 wks).

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
| ~~M-A03~~ | ~~Stock adjustment UI~~ | ❌ Removed (POS handles stock) |
| **H-A09** | Order timeline UI | New admin section reading existing data |
| **ADM-15** | Packing workflow UI | New admin section, independent of catalog |
| **ADM-16** | POS handoff status | New column + UI, independent |
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
| ~~C-03 Server shipping~~ | ~~M-A02~~ | ❌ Removed — POS handles billing |
| **C-OW2 Partial availability** | **C-OW1 verification UI + DB-M14** | Needs per-item availability tracking |
| **C-OW3 Customer confirmation** | **C-OW2** | Customer confirms after seeing availability |
| **C-OW4 Notifications** | **H-M01 email provider + DB-M16** | Notification table + email sending |
| **H-P02 Arabic/RTL** | **H-P03 i18n framework** | Strings need a framework |
| **SEO-08 JSON-LD** | **H-SE05 server-render products** | Structured data needs server HTML |
| **M-C04 Order detail** | **API-M04 order detail endpoint** | UI calls the API |
| **M-OW1 Customer order detail** | **API-OW2 customer confirm endpoint** | UI calls the API |
| ~~ADM-10 Stock adjustment~~ | ~~API-M09~~ | ❌ Removed — POS handles stock |
| **PER-01 Catalog caching** | **H-S05 migrate siloed catalogs** | Cache invalidation needs single source |
| **SEC-03 Rate limiting** | **DEP-05 middleware.ts** | ✅ Done — rate limit lives in middleware |
| **SEC-06 Admin gate** | **DEP-05** | ✅ Done — gate lives in middleware |
| ~~C-04 Stock txn~~ | ~~C-03~~ | ❌ Removed — website does not manage stock |
| **L-01 Multi-currency** | **TD-19 `fmt()` refactor** | Display helper must be currency-aware |
| ~~H-P01 Payment~~ | ~~C-03/C-04~~ | ❌ Removed — POS handles billing |

---

## 19. Dependency graph

```
Phase 0 (Stabilise) ✅ ─────────────────────────────────────────────
  │
  ▼
Phase 1 (Security) ✅ ─── DEP-05 middleware.ts ──┐
  │                                              ├──► SEC-03 rate limit ✅
  │                                              └──► SEC-06 admin gate ✅
  ▼
Phase 2 (Order verification workflow)
  │  └── H-A05 state machine ──► DB-M14 item availability
  │                             └─► C-OW1 staff verify ──► C-OW2 partial avail
  │                                                        └─► C-OW3 customer confirm
  ▼
Phase 3 (Admin) ─────── H-A02 login ──► H-A01 product edit/delete
  │                     └── H-A04 pagination (independent)
  │                     └── H-A07 audit viewer (independent)
  │                     └── ADM-15 packing + ADM-16 POS handoff (independent)
  │                     └── H-M01 email ──► C-OW4 notifications
  ▼
Phase 4 (Storefront) ── C-09 hamburger (independent)
  │                     └── H-S06 Tailwind build (independent)
  │                     └── H-S05 migrate siloed catalogs ──► PER-01 caching
  ▼
Phase 5 (i18n + SEO) ── H-P03 i18n framework ──► H-P02 Arabic/RTL
  │                     └── H-SE05 server-render ──► SEO-08 JSON-LD
  ▼
Phase 6 (Customer order experience) ── DB-M16 notifications ──► C-OW4 inbox
  │                                    └── M-OW1 order detail ──► M-OW3 tracking
  │                                    └── M-C02 password reset (needs H-M01)
  ▼
Phase 7 (Perf) ──────── H-S05 (single catalog) ──► PER-01 caching
  │                     └── indexes (independent)
  ▼
Phase 8 (Tests + CI) ── all prior features stable ──► E2E tests meaningful
  │
  ▼
Phase 9 (Polish) ────── ongoing, parallelisable
```

**Critical path (longest dependency chain, post-pivot):**
`Phase 0 → Phase 1 → Phase 2 (workflow) → Phase 3 (email) → Phase 6 (notifications) → M4 launch`
= **~88 d solo, ~14 weeks with 2 engineers.** (Was ~96 d / ~16 wks pre-pivot —
the payment gateway was on the critical path and is now removed.)

**Parallelisation lanes (independent, can run concurrently):**
- Lane A (admin): Phase 3
- Lane B (storefront): Phase 4
- Lane C (i18n/SEO): Phase 5
- Lane D (infra): Phase 7 + Phase 8 tests

With **4 engineers**, one per lane, Phases 3/4/5/7+8 run concurrently after
Phase 2, compressing M4 to **~10–12 weeks**.

---

## 19a. Customer features (post-pivot scope)

> The customer-facing feature set is strictly **order management** — no payment,
> no billing, no stock visibility.

| Feature | Status |
|---|---|
| Browse products (catalog, search, filters) | ✅ Exists (partial) |
| Place an order | ✅ Exists |
| Track order (live timeline) | Pending (M-OW3) |
| Receive notifications (order status changes) | Pending (C-OW4) |
| View unavailable products in their order | Pending (C-OW2, M-OW1) |
| Accept partial order (confirm available items) | Pending (C-OW3, M-OW1) |
| Cancel order | Pending (C-OW3) |
| View previous orders | ✅ Exists (account.js) |
| Reorder previous order | Pending (M-C04) |
| Manage saved addresses | Pending (M-C01) |
| Manage profile | ✅ Exists (PATCH /api/auth/me) |
| Wishlist | ✅ Exists |

**Explicitly out of scope:** online payment, invoice download, refund requests,
stock/inventory visibility, warehouse browsing.

## 19b. Staff features (post-pivot scope)

> Staff features focus on **operational order management** — reviewing,
> verifying, packing, and handing off orders to the POS/delivery.

| Feature | Status |
|---|---|
| Review incoming order | Pending (H-A08) |
| Mark product available / unavailable | Pending (C-OW1, H-A08) |
| Send confirmation request to customer | Pending (C-OW1) |
| Edit unavailable products (substitute / remove) | Pending (C-OW2) |
| Pack order | Pending (ADM-15) |
| Mark ready for delivery | Pending (ADM-15) |
| Assign delivery / mark out for delivery | Pending (ADM-16) |
| Mark delivered | Pending (ADM-16) |
| Add internal notes to order | Pending (DB-M15) |
| View order timeline | Pending (H-A09) |
| Product CRUD (create/edit/delete) | Partial (create only; edit/delete pending H-A01) |
| Master data CRUD (12 entities) | ✅ Exists |
| Customer management | Partial (activate/deactivate; CRUD pending M-A01) |
| Audit log viewer | Pending (H-A07) |

**Explicitly out of scope:** stock adjustment, inventory management, invoice creation,
refund processing, warehouse management, barcode scanning, receipt printing.

## 19c. Optional future integrations (explicitly NOT in core roadmap)

> These are listed for completeness only. They are **not part of any sprint**
> and should not be planned until the core order-management platform is
> stable in production. Each would be a separate initiative with its own scoping.

| Integration | Description | Trigger |
|---|---|---|
| POS integration | Sync order data to/from the POS system for invoicing + status feedback | When the business decides to connect the two systems |
| Inventory synchronization | Read stock levels from the POS to show availability on the website pre-order | When real-time availability becomes a business need |
| Payment gateway | Accept online payment as a customer convenience (POS still produces the invoice) | L-15, future |
| Accounting integration | Export order data to accounting software | When finance team requests it |
| Barcode scanner | Scan products during packing to verify correctness | When warehouse/packing volume justifies it |
| Receipt printing | Print order summaries for delivery drivers | When delivery operations require paper trails |
| ERP integration | Connect to a broader ERP for procurement + reporting | Enterprise-scale initiative |

---

## 20. Final production checklist

Every item must be ✅ before flipping the production switch. Items are
grouped by milestone exit criteria; the milestone gate cannot close until
its group is green.

### M0 — Safe to develop (Phase 0+1) ✅ COMPLETE
- [x] No secret in `.env` is default or weak (SEC-01) — ✅ Sprint 0
- [x] App connects via dedicated non-superuser role to dedicated DB (SEC-02) — ✅ Sprint 0
- [x] Login + register rate-limited (SEC-03) — ✅ Sprint 1
- [x] CSRF tokens issued + validated on mutations (SEC-04) — ✅ Sprint 1
- [x] `requireAdmin` exists; STAFF cannot perform admin-only ops (SEC-05) — ✅ Sprint 1
- [x] `middleware.ts` enforces admin route gate server-side (SEC-06) — ✅ Sprint 1
- [x] All `Category.slug` values match `^[a-z0-9-]+$` (C-08) — ✅ Sprint 0
- [x] Warehouse department has its categories (seed routing fixed) — ✅ Sprint 0
- [x] Fresh visitor sees an empty cart (no dummy items) (C-10) — ✅ Sprint 0
- [x] No page title/footer carries a non-AL-NASSIM brand (C-11) — ✅ Sprint 0
- [x] Logo links directly to `/` (no redirect bounce) (M-S05) — ✅ Sprint 0
- [x] Favicon served (no 404) (M-S02) — ✅ Sprint 0

### M1 — Order verification workflow (Phase 2)
- [ ] New `OrderStatus` values added via migration: UNDER_REVIEW, READY_FOR_CONFIRMATION, READY_FOR_DELIVERY, CANCELLED_BY_CUSTOMER, CANCELLED_BY_STAFF (H-A05)
- [ ] `OrderItem.availability` enum tracks per-item availability (DB-M14)
- [ ] `Order.posStatus` enum tracks POS handoff (DB-M17)
- [ ] Staff can review orders and mark items available/unavailable (C-OW1/H-A08)
- [ ] Customer sees item-level availability breakdown (C-OW2)
- [ ] Customer can confirm "proceed with available" or cancel (C-OW3)
- [ ] Order workflow state machine enforces valid transitions (H-A05)
- [ ] Single source of truth for product images (H-S04)
- [ ] Cart "wishlist" button moves item to wishlist (H-S07)
- [ ] Cart badge updates on every page (H-S08)

### M2 — Operable admin (Phase 3)
- [ ] Admin login screen exists at `/admin/login` (H-A02)
- [ ] Product edit + delete buttons work in admin UI (H-A01)
- [ ] All admin lists paginate (H-A04)
- [ ] AuditLog viewer searchable in admin (H-A07)
- [ ] Customer create/edit/role-change available (M-A01)
- [ ] Settings UI works (M-A02)
- [ ] Packing workflow UI works — staff marks order as packed (ADM-15)
- [ ] POS handoff status works — staff marks invoice created / handed to delivery (ADM-16)
- [ ] Order timeline UI shows status event history (H-A09)
- [ ] Transactional email provider wired (H-M01) — for order notifications

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
- [ ] Order-workflow notifications send at each step (C-OW4) — order received, under review, ready for confirmation, confirmed, packing, delivered
- [ ] Customer notification inbox works in-app + via email (API-OW4)
- [ ] Customer order tracking page shows live timeline (M-OW3)
- [ ] Customer can confirm/cancel from order detail page (M-OW1)
- [ ] Password reset flow works end-to-end (M-C02)
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
