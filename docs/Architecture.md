# Architecture

> Project: **nassim-platform**
> Audit date: 2026-07-21

This document describes the runtime architecture, request/data flow, and the
principal architectural decisions (and their trade-offs) in the codebase.

---

## 1. Architectural style

The platform is a **hybrid monolith** that combines three distinct execution
models in a single Next.js deployment:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Next.js 15 App Router                            │
│                                                                          │
│   ┌────────────────────────┐   ┌──────────────────────────────────────┐ │
│   │  Static HTML storefront │   │  Admin SPA  (React client components)│ │
│   │  served verbatim from   │   │  app/admin/** (gated by /auth/me)    │ │
│   │  public/*.html          │   │  Tailwind via CDN                    │ │
│   └───────────┬────────────┘   └────────────────┬─────────────────────┘ │
│               │  fetch()                         │  fetch()               │
│               ▼                                  ▼                        │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │              Route Handlers  (app/api/**/route.ts)                │  │
│   │   Zod validation  →  requireStaff() / getSessionUser()           │  │
│   │   Prisma queries  →  PostgreSQL                                 │  │
│   └──────────────────────────────────┬───────────────────────────────┘  │
│                                      │                                   │
└──────────────────────────────────────┼───────────────────────────────────┘
                                       ▼
                         ┌──────────────────────────┐
                         │   PostgreSQL (Prisma 6)  │
                         │   20 models / 4 enums    │
                         └──────────────────────────┘
```

1. **Storefront** — hand-written static HTML in `public/`, decorated at runtime
   by vanilla-JS bundles (`public/assets/js/*.js`) that call the API.
2. **Admin SPA** — a small client-side React app under `app/admin/`, rendered
   by Next.js but behaving as a single-page tab shell.
3. **REST API** — Next.js Route Handlers under `app/api/**`, the only
   server-rendered logic in the project.

There is **no SSR storefront**, **no ISR**, **no server components doing data
fetching** (the only server component is the bare `app/layout.tsx`). All
dynamic data is fetched client-side.

---

## 2. Routing model

### URL → handler mapping

| URL | Served by | Notes |
|---|---|---|
| `/` | `public/index.html` (rewrite in `next.config.mjs`) | Bypasses React root layout |
| `/*.html` | `public/<file>.html` | Static |
| `/api/*` | `app/api/**/route.ts` | REST, JSON |
| `/api/catalog` | special — returns `application/javascript` | Sets `window.NASSIM_PRODUCTS` |
| `/admin`, `/admin/<section>` | `app/admin/**/page.tsx` | All render `<AdminApp>` |

### Admin routing quirk

`app/admin/<section>/page.tsx` files are 7-line wrappers that pass an
`initialTab` prop to `<AdminApp>`. Actual navigation is **client-side tab
switching** (`useState` in `AdminApp.tsx`), not URL-based. Deep links set the
initial tab but URL does not change as the user navigates.

---

## 3. Request lifecycle (API)

Every API route follows the same template:

```
1. Request arrives at app/api/<resource>/route.ts
2. Parse JSON body (manual JSON.parse, no body parser lib)
   └─ on failure → 400 { error: "Invalid JSON" }
3. (If admin route) const staff = await requireStaff();
   └─ if null → 401/403 { error: "Staff access required" }
   (If user route) const user = await getSessionUser();
   └─ if null → 401
4. Validate input with an inline Zod schema
   └─ on failure → 400 { error: "<message>" }
5. Business logic via Prisma (parameterized queries only — no raw SQL)
6. On mutation: prisma.auditLog.create({ actorId, action, entity, entityId, detail })
7. Return JSON envelope { success, data, error }
```

The **audit log** is consistently written by every admin mutation
(`customers/[id]`, `hierarchy`, `master`, `orders`, `products`). This is a
strong cross-cutting pattern.

### Response envelope

Most routes return `{ success: boolean, data?: …, error?: string }`. A few
inconsistencies exist:

- `POST /api/orders` returns both top-level `order` and `data.order`.
- `GET /api/orders` returns both top-level `orders` and `data.orders`.
- Error responses are sometimes `{ error }` only, sometimes `{ success: false, error }`.

There is **no shared response helper** — every route hand-writes the JSON.

---

## 4. Authentication & session architecture

```
        ┌──────────────── browser ────────────────┐
        │   Cookie: nassim_sid = <JWT HS256>       │
        │            payload: { uid, sid, exp }    │
        └──────────────────┬───────────────────────┘
                           │ every request (automatic, httpOnly)
                           ▼
┌──────────────────────────────────────────────────────────┐
│ getSessionUser()  (lib/auth.ts)                          │
│   1. jwt.verify(cookie, JWT_SECRET)  → { uid, sid }      │
│   2. prisma.session.findUnique({ id: sid, include: user})│
│   3. null if session missing OR expiresAt < now          │
│   4. null if !user.isActive                              │
│   5. return user                                         │
└──────────────────────────────────────────────────────────┘
```

**Key properties**
- The DB `Session` row is the **source of truth**; the JWT is a carrier token.
  This allows server-side revocation (delete the row) without rotating
  `JWT_SECRET`.
- `isActive=false` on the user instantly invalidates all their sessions.
- `requireStaff()` wraps `getSessionUser()` and additionally requires
  `role ∈ {ADMIN, STAFF}`.

**Architectural gaps**
- No `middleware.ts` → every route must remember to call the gate.
- No `requireAdmin` → STAFF has identical privileges to ADMIN.
- No CSRF token (only `sameSite=lax`).
- No rate limiting on login/register.

---

## 5. Data architecture

The database holds **two conceptual domains**:

1. **E-commerce core** (Phase 1, migration `…_init`) — Department → Category →
   Product, Users, Sessions, Cart, Wishlist, Orders, OrderItems,
   OrderStatusEvents, Settings, AuditLog.
2. **ERP master data** (Phase 2, migration `…_phase2_erp_master_data`) —
   Section, Subcategory, Brand, Material, Color, Size, Supplier, Unit, Country,
   Tax, ProductColor, ProductSize, ProductImage, StockMovement, Address.

See `Database_Overview.md` for the entity map.

### Referential integrity notes

- All FKs have explicit `ON DELETE` behaviour (CASCADE for join tables and
  dependent rows; SET NULL for optional relations like `Order.userId`;
  RESTRICT for category/department parents).
- `OrderItem.productId` is **SET NULL** on product delete — but Product deletes
  are *soft* (`isActive=false`), so this rarely fires.
- `AuditLog.actorId` and `StockMovement.actorId` are **intentionally not FKs** —
  audit records must survive user deletion.

### Decimal handling

All money is `Decimal(10,3)` (Kuwaiti Dinar uses 3 decimal places). The API
returns these as `Number(p.price)` in some places — fine for KD magnitudes
but loses precision in general. Frontend formats with `.toFixed(3)`.

---

## 6. State management

There is **no global state layer**.

- **Admin:** every tab component owns its own `useState` hooks and refetches
  independently. No Context, no reducer, no SWR/React Query. There is no
  cross-tab state synchronization (e.g. creating a brand in Master Data does
  not refresh the dropdown in Products until manual reload).
- **Storefront:** state lives in **localStorage**:
  - `nassim_cart` — `{ state: { items, shipping: 2.5, currency: "KD" } }`
  - `nassim_wishlist` — same shape
  - `nassim_dark` — dark mode flag
- Each `*.html` page bootstraps the user session via `GET /api/auth/me`
  (`account.js`) and updates the cart badge via `cart-nav.js`.

---

## 7. Component architecture

### Admin (`app/admin/`)

```
AdminApp.tsx  (root client component)
├── auth gate (fetch /api/auth/me → role check)
├── header + 5-tab nav
├── DashboardTab   (inline in AdminApp.tsx)
├── ProductsTab    (rich create form, NO edit/delete UI)
├── OrdersTab      (inline in AdminApp.tsx; list + status change)
├── MasterDataTab  → MasterDataPanel  (generic CRUD for 12 entities)
└── CustomersTab   (list + detail + activate/deactivate)
```

Each tab is self-contained. `MasterDataPanel` is the most abstract piece —
driven by a `fieldConfig(entity)` schema map, it renders tables/forms for all
12 master-data entities dynamically.

### Storefront

There are **no React components** for the storefront. Reusable behaviour lives
in vanilla-JS files (`product-nav.js`, `cart-nav.js`, `search.js`,
`account.js`, `checkout.js`, `dark-overrides.js`) included at the bottom of
each HTML page. There is **no shared header/footer include** — markup is
copy-pasted into every HTML file (and drifts).

---

## 8. Catalog distribution

Product data is distributed across **two parallel sources** that can drift:

1. **Database** (source of truth) → exposed via `GET /api/catalog` as a
   JavaScript file that sets `window.NASSIM_PRODUCTS`. Consumed by
   `product-nav.js`, `product view.html`, and `kitchenware.html`.
2. **Static fallback** (`public/assets/js/products.js`) — a hardcoded array of
   67 products with Google-hosted stock images. Used as a fallback when the
   API fails (via `document.write` in `product view.html`) and as the source
   for `seed.mjs`.

Additionally, **some category pages** (`forklift.html`, `rack.html`,
`trolly.html`) embed their **own inline product arrays** with local image
paths, completely bypassing both the API and the static catalog. These
duplicate/siloed catalogs are a maintenance hazard.

---

## 9. Cross-cutting concerns — status matrix

| Concern | Implementation | Status |
|---|---|---|
| Authentication | `lib/auth.ts` (DB session + JWT) | ✅ Solid |
| Authorization | `requireStaff()` per route | ⚠️ No ADMIN/STAFF split; no middleware |
| Input validation | Inline Zod per route | ✅ Consistent (except `admin/customers/[id]` PATCH) |
| Error handling | try/catch + JSON `{error}` | ⚠️ Inconsistent envelope; no error codes |
| Logging | `console.error` only | ❌ No structured logging |
| Audit log | `AuditLog` table on every admin mutation | ✅ Consistent |
| Rate limiting | none | ❌ Missing |
| CSRF | `sameSite=lax` only | ⚠️ No token |
| CORS | none configured (same-origin) | ⚠️ Implicit |
| Security headers | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` | ⚠️ No CSP/HSTS |
| File upload | local `public/uploads/` | ⚠️ Not cloud, not serverless-safe |
| Caching | `force-dynamic` everywhere public | ❌ No cache strategy |
| i18n | none | ❌ No Arabic/RTL |
| SEO | per-page `<title>` only | ❌ No OG, no sitemap, no JSON-LD |
| Testing | none | ❌ Zero tests |
| Observability | none | ❌ No metrics/tracing |

---

## 10. Deployment model implications

The current architecture implies a **self-hosted long-running Node server**:

- File uploads write to `public/uploads/` inside the deployment → breaks on
  read-only/serverless platforms (Vercel, Lambda).
- Tailwind is loaded from a public CDN at runtime → adds latency, external
  dependency, and a runtime CSS compilation step.
- `force-dynamic` on public catalog endpoints → no CDN caching of the
  storefront catalog.
- No `middleware.ts` → cannot enforce auth or geo at the edge.

If the goal is a managed platform (Vercel/Supabase as `AGENTS.md.txt`
implies), the upload path, Tailwind tooling, and caching headers all need
rework.

---

## 11. Architectural debt (summary)

1. **Two storefronts in one repo** — static HTML (current) vs. the implied
   React/Next.js storefront in `AGENTS.md.txt`. Strategy must be picked.
2. **Three product catalogs** (DB, `products.js`, inline HTML arrays) —
   divergent sources of truth.
3. **Tailwind via CDN** — production-blocker for both storefront and admin.
4. **No edge middleware** — auth/rate-limit/CSRF must move there.
5. **Local filesystem uploads** — needs cloud storage migration.
6. **STAFF ≡ ADMIN** — role model is flat; needs `requireAdmin`.
7. **No state-management/cache layer** — admin UX is poor at scale.
8. **`code backup/` and `rackingpage/`** — orphan code that should be removed
   or integrated.
