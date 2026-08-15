# Current Status

> Project: **nassim-platform**
> Audit date: 2026-07-21
> Git branch: `main` — latest commits implement the admin panel + Phase 2 ERP master data

This document assesses, module by module, the **completion state** of the
project today, then gives percentage estimates per layer. It is the
"go/no-go" companion to `Project_Audit.md`.

---

## 1. Project phase

The project is in **late MVP / early vertical-slice** stage for the
**admin + backend**, and **prototype** stage for the **storefront**.

Two phases are visible in git history and migrations:

- **Phase 1** (commit `ec92b2f` and earlier, migration `…_init`): core
  e-commerce schema (Departments, Categories, Products, Users, Sessions,
  Cart, Wishlist, Orders), public + admin APIs, admin skeleton.
- **Phase 2** (commits `1d48f76`, `9af7c8a`, `0774f55`, migration
  `…_phase2_erp_master_data`): ERP-style master data (12 lookup entities),
  product extensions (specs, dimensions, SEO, stock status), and the admin
  Master Data + Hierarchy CRUD UI.

There is **no Phase 3** (payment, Arabic/RTL, full React storefront,
analytics, email, testing, production hardening) started.

---

## 2. Module-by-module status

Legend: ✅ Complete · 🟡 Partial · 🔴 Stub / Missing · ⚪ N/A

### 2.1 Infrastructure

| Module | Status | Notes |
|---|---|---|
| Next.js 15 app shell | ✅ | App Router configured; root layout minimal |
| Prisma + PostgreSQL | ✅ | 2 migrations, in sync with schema |
| Auth (DB sessions + JWT) | ✅ | Solid; bcrypt cost 10; 30-day expiry |
| File upload | 🟡 | Works but local-only; no content sniff |
| Logging | 🔴 | `console.error` only — no structured logger |
| Error tracking | 🔴 | None |
| Rate limiting | 🔴 | None |
| Middleware (edge) | 🔴 | No `middleware.ts` |
| Test suite | 🔴 | Zero tests |
| CI/CD | 🔴 | None configured |

### 2.2 API surface

| Module | Status | Notes |
|---|---|---|
| Auth (register/login/logout/me) | ✅ | Complete; missing rate limit |
| Cart | 🟡 | API complete but **not called by storefront**; no stock check; replace-not-increment semantics |
| Wishlist | ✅ | Server-synced when logged in |
| Catalog (products, categories, catalog.js) | ✅ | Public; no caching |
| Orders (place + list own) | 🟡 | Functional; **trusts client shipping**; stock race |
| Admin: stats | ✅ | 8 aggregations; revenue definition loose |
| Admin: orders (list + status) | 🟡 | No state machine; no pagination (200 cap) |
| Admin: products (CRUD) | ✅ | Full API incl. soft delete |
| Admin: customers (read + activate) | ✅ | No edit/role-change/delete; PATCH has no Zod |
| Admin: hierarchy CRUD | ✅ | 4 entities, full CRUD |
| Admin: master CRUD | ✅ | 8 entities, full CRUD via dynamic delegate |
| Admin: upload | ✅ | Works for self-hosted only |
| Audit log | ✅ | Written by every admin mutation (read by no UI) |

### 2.3 Admin UI (`app/admin/`)

| Module | Status | Notes |
|---|---|---|
| Shell, header, nav | ✅ | Tailwind via CDN (prod-blocker) |
| Auth gate | 🟡 | Client-side only; no server gate at layout |
| Login screen | 🔴 | None — relies on storefront sign-in |
| Dashboard / stats | ✅ | Cards + 4 read-only sections |
| Products tab | 🟡 | **Create-only**; **no edit/delete UI** despite API support; dead `filteredSubcategories` code |
| Orders tab | 🟡 | List + expandable detail + status change; no create/refund |
| Customers tab | 🟡 | List + detail + activate/deactivate; no create/edit/role |
| Master data tab | ✅ | Full CRUD for 12 entities; minor: dead `multiselect` type, unfiltered subcategory parent |
| Hierarchy tab | ✅ | (shares MasterDataPanel) |
| Image upload + media library | ✅ | Drag-drop, reorder, set primary, remove |
| Pagination/search | 🟡 | All client-side over full datasets — won't scale |

### 2.4 Storefront (`public/`)

| Module | Status | Notes |
|---|---|---|
| Homepage | 🟡 | Static; DB-driven sections; broken logo link; dead `EN\|AR` toggle |
| Category pages (DB-driven: kitchenware, etc.) | 🟡 | Filter UI partial — color/unit filters have **no JS handler**; cross-category fallback leaks products |
| Category pages (hardcoded: forklift, rack, trolly) | 🟡 | Siloed inline catalogs that drift from DB |
| Product detail (`product view.html`) | 🟡 | Functional; uses `document.write` fallback; filename has a space |
| Cart | 🟡 | localStorage-only; dummy default items; "wishlist" button on rows is cosmetic |
| Checkout | 🟡 | Submits to `/api/orders`; COD only; trusted shipping field |
| Wishlist | ✅ | localStorage + server sync; cross-tab sync via storage event |
| Auth (account.js) | ✅ | Register/login/logout/profile — functional |
| Search overlay | ✅ | Debounced `/api/products` query |
| Responsive design | 🟡 | Tailwind responsive classes; same CDN caveat |
| Dark mode | ✅ | Toggle + CSS overrides |
| Arabic / RTL | 🔴 | None — toggle is decorative |
| SEO | 🔴 | No OG, no sitemap, no robots.txt, no JSON-LD; thin titles |
| Payment | 🔴 | COD only — no gateway |
| Localization | 🔴 | English-only |
| Analytics | 🔴 | None |

### 2.5 Data model

| Module | Status | Notes |
|---|---|---|
| Core e-commerce tables | ✅ | Phase 1 complete |
| ERP master data | ✅ | Phase 2 schema complete |
| `StockMovement` | 🔴 | Defined + indexed; **never written** |
| `Address` | 🔴 | Defined; **no API writes** |
| `Section` / `Subcategory` | 🟡 | Schema + admin CRUD; seed doesn't populate; storefront ignores |
| `Setting` | 🟡 | Only 2 keys; order placement ignores `shipping_fee` setting |
| `OrderStatusEvent` | 🟡 | Written but **read by no UI** |
| `ProductImage` | 🟡 | Admin writes; storefront reads `Product.image/images` instead |
| `REFUNDED` status | 🟡 | Enum value; no UI button |
| Seed idempotency | 🟡 | Product upsert **overwrites** admin edits on re-seed |
| Seed department routing | 🔴 | Bug: all categories land in `houseware`; `warehouse` empty |

---

## 3. Dead / orphan / duplicate code

| Item | Location | Type |
|---|---|---|
| `rackingpage/` (entire Vite prototype) | repo root | Orphan — not integrated |
| `code backup/` (3 large HTML files + `1/`) | repo root | Legacy snapshots; excluded from tsconfig |
| `home.html` | `public/` | Near-duplicate of `index.html`; redirected away but still shipped |
| `carousel_js.txt` | `public/` | Orphan JS snippet; selectors match nothing |
| `filteredSubcategories` + "// Let me fix this" | `ProductsTab.tsx:167-170` | Dead code from incomplete refactor |
| `"multiselect"` field type | `MasterDataPanel.tsx:423` | Declared in type; never rendered |
| `defaultOrderBy` field | `master/[entity]/route.ts:24` | Declared; never read |
| 2 truncated PNGs | `public/uploads/` | Corrupted/empty uploads |
| `ChatGPT Image … .png` | `public/topcar/products_houseware/` | Generated-asset filename shipped to prod |
| Template-brand leakage | `advertisment.html`, `cool.html`, `cold.html` | Titles/footers still say "Atelier Nord", "Arctic Precision", "Arctic Bespoke" |
| Google stock images (`aida-public`) | 18+ pages | Placeholder imagery, incl. default cart contents |
| `href="#"` links | every page mega-menu/footer | Dead navigation (Customized Packaging, Cold Rooms, footer columns) |
| `code.html` / `code_temp.html` / `dummy12.html` / `house_temp.html` | referenced in redirects only | Targets absent; redirected to `/index.html` |

---

## 4. TODO / FIXME scan

A repo-wide grep for `TODO`, `FIXME`, `XXX`, `HACK` returns **zero matches**
in `app/`, `lib/`, `prisma/`, and `public/assets/js/`. The codebase is
unusually clean of inline markers — work-in-progress is not signalled by
comments but is visible in the implementation gaps listed above.

The closest thing to a TODO is the inline developer note in
`app/admin/_components/ProductsTab.tsx:169`:
> `// Actually subcategories have categoryId, not departmentId. Let me fix this.`

…followed by the corrected `subcatsOfCategory` computation, with the dead
`filteredSubcategories` left above it.

---

## 5. Completion estimates

These estimates weigh **production-readiness**, not just "does it run".
A module that works locally but ships via a CDN, lacks tests, or has no
auth hardening is not 100%.

| Layer | Completion | Rationale |
|---|---:|---|
| **Database / schema** | **~90%** | Schema is comprehensive (20 models, 4 enums), migrations in sync, indexed. Minus for unused tables (`StockMovement`, `Address`), seed bugs, and `OrderStatus.REFUNDED` not surfaced. |
| **Backend / API** | **~80%** | All 18 routes functional, validated, audit-logged, no SQL-injection surface. Minus for: no rate limiting, no CSRF, flat ADMIN/STAFF, order shipping/stock integrity gaps, no pagination on several admin lists, no shared response helper. |
| **Admin panel** | **~55%** | Master Data + Hierarchy CRUD and dashboard are solid. Minus for: **no product edit/delete UI**, **no admin login screen**, client-side-only auth gate, Tailwind via CDN, client-side pagination, no role separation. |
| **Storefront (user website)** | **~45%** | Functional static-HTML storefront wired to the API for core flows. Minus for: siloed catalogs, dead filter UI, dummy default cart, no Arabic/RTL, no SEO, no payment, broken/template-brand pages, localStorage cart not synced to API. |
| **Overall** | **~55–60%** | Vertical slice works end-to-end (browse → cart → checkout → order → admin). Hardening, storefront rebuild, i18n, payments, and testing remain. |

### Visual summary

```
Database        ████████████████████░  ~90%
Backend / API   ████████████████░░░░░  ~80%
Admin panel     ███████████░░░░░░░░░░  ~55%
Storefront      █████████░░░░░░░░░░░░  ~45%
                                     ─────
Overall                              ~55–60%
```

---

## 6. What "done" would require (gap list)

To move from current state to a production launch, the following are needed
(in rough priority order):

1. **Storefront strategy** — decide: keep static HTML and finish wiring, or
   rebuild as Next.js pages (the `AGENTS.md.txt` direction). The current
   hybrid is the largest source of drift.
2. **Payment integration** — KNET / Tap / Stripe; currently COD only.
3. **Arabic / RTL** — full bilingual UI; `AGENTS.md` mandates it.
4. **Admin gaps** — product edit/delete UI, admin login screen, server-side
   auth gate (middleware), pagination, role separation.
5. **Security hardening** — rate limiting, CSRF, `requireAdmin`, file-upload
   content sniff, move uploads to cloud storage, rotate committed secrets.
6. **SEO** — per-page metadata, OG/Twitter cards, `sitemap.xml`, `robots.txt`,
   JSON-LD, server-rendered product content.
7. **Order integrity** — server-authoritative shipping, transactional stock
   check, order state machine, `REFUNDED` flow.
8. **Performance** — cache public catalog, install Tailwind properly, add
   pagination to admin lists, `next/image`.
9. **Observability** — structured logging, error tracking, analytics.
10. **Tests** — at minimum: API route tests, auth tests, checkout flow test.
11. **Clean-up** — delete `code backup/`, decide on `rackingpage/`, remove
    `home.html`, dead `href="#"` links, template-brand leftovers, corrupted
    uploads, and the `filteredSubcategories` dead code.

---

## 7. Risk summary

| Risk | Severity | Likelihood |
|---|---|---|
| Committed secrets in `.env` (DB password, JWT secret, admin password) | 🔴 High | Confirmed |
| Brute-force on login/register (no rate limit) | 🔴 High | Confirmed |
| Order total manipulation via `shipping` field | 🟠 Medium | Confirmed |
| Oversell via stock race | 🟠 Medium | Confirmed |
| Tailwind CDN outage → unstyled site | 🟠 Medium | External dependency |
| Local-file uploads lost on redeploy / break on serverless | 🟠 Medium | Architectural |
| Admin product edit/delete missing → catalog correction requires DB access | 🟡 Low impact / High annoyance | Confirmed |
| No tests → regressions undetected | 🟠 Medium | Confirmed |
