# Changelog

All notable changes to this project are documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/),
versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Sprint 4+5 — Admin Operations + Storefront Polish (2026-07-22)

#### Admin login
- New dedicated admin login page at `/admin/login` — dark-themed, redirect-
  back-after-login, validation, loading state, Suspense-wrapped.
- Middleware now redirects unauthenticated `/admin` to `/admin/login`
  (was `/home.html`).
- AdminApp denied screen links to the admin login page.

#### Audit log
- New API: `GET /api/admin/audit-log` — paginated, searchable, filterable
  by entity, with actor names resolved.
- New admin tab: Audit Log — searchable table, entity filter, pagination,
  CSV export.

#### Storefront mobile navigation
- New `mobile-nav.js` — hamburger button + slide-out drawer with all
  categories, cart, wishlist, track order. Injected into all 20 pages.
- Works alongside existing desktop mega-menu (hidden on mobile via
  `md:flex`).

#### Storefront polish
- Fixed 180 dead `href="#"` mega-menu links → real category pages.
- Added `loading="lazy"` to 181 storefront images for performance.

#### Files
- New: `app/admin/login/page.tsx`, `app/api/admin/audit-log/route.ts`,
  `public/assets/js/mobile-nav.js`, `docs/Sprint_4_Report.md`
- Modified: `middleware.ts`, `app/admin/AdminApp.tsx`,
  all 20 `public/*.html` files, `docs/MASTER_DEVELOPMENT_PLAN.md`

### Sprint 3 — Customer Experience & Order Entry Foundation (2026-07-22)

#### Bug fix
- **POST /api/orders 400 fixed**: Zod email validation rejected empty strings
  from guest users. Changed to `z.union([email, literal(""), undefined()])`
  so guests can checkout without providing an email.

#### Auth UX
- `GET /api/auth/me` now returns 200 `{user: null, guest: true}` for
  unauthenticated users instead of 401. Eliminates console errors on every
  page for guests. Frontend treats this as Guest Mode.

#### Guest checkout
- Checkout form rebuilt with Kuwait-specific address fields: Area, Block,
  Street, Building, Floor, Apartment, Landmark, Delivery Notes.
- Guests can place orders without an account.
- Double-submit prevention (loading state + disabled button).
- Validation for required fields (name, phone, area, block, street).
- Success page with order number + tracking link.
- Cart cleared after successful order.

#### Registered checkout
- Auto-populates name, phone, email from account.
- Loads default address from `/api/addresses` if available.
- "Save Address" checkbox to persist the delivery address.
- Logged-in banner: "Using saved account information."

#### Cart merge
- After login or signup, guest cart items (localStorage) are merged into
  the server cart via `POST /api/cart`. Never loses products.
- Guest cart cleared after merge.

#### Wishlist
- Guest users clicking wishlist on the PDP see a popup:
  "Create an account to save products to your wishlist" with Sign In /
  Create Account / Continue Browsing buttons. Guest wishlist NOT saved.
- Logged-in users get the normal wishlist toggle with server sync.

#### Customer account
- Profile menu updated: added Track Order + Wishlist links.
- Order list items link to `order-detail.html` for tracking.
- Status colours updated for all 11 workflow statuses.

#### New APIs
- `GET /api/addresses` — list saved addresses
- `POST /api/addresses` — create a saved address

#### Files
- New: `app/api/addresses/route.ts`, `docs/Sprint_3_Report.md`
- Modified: `app/api/orders/route.ts`, `app/api/auth/me/route.ts`,
  `public/assets/js/checkout.js`, `public/assets/js/account.js`,
  `public/checkout.html`, `public/product view.html`

### Sprint 2 — Order Verification Workflow (2026-07-21)

#### index.html retirement
- `home.html` is now the single application homepage. All references
  (logo links, footer links, JS fallbacks, admin SPA links, `next.config.mjs`
  rewrite) migrated from `index.html` to `home.html`.
- `/` rewrites to `/home.html`; `/index.html` 308-redirects to `/home.html`.
- `public/index.html` deleted. Zero `index.html` references remain.

#### Security
- **Edge middleware** (`middleware.ts`): server-side gate for `/admin`
  routes — unauthenticated users are redirected to the storefront before
  the admin page chrome renders. Previously the gate was client-side only.
- **Role-based access control**: added `requireAdmin()` to `lib/auth.ts`.
  Destructive operations (product delete, hierarchy delete, master delete,
  customer deactivate) now require ADMIN role; STAFF users receive 403.
  Routine reads and status changes remain available to STAFF.
- **Rate limiting**: `/api/auth/login` and `/api/auth/register` limited to
  10 requests per minute per IP per endpoint. Excess requests return 429
  with a `Retry-After` header. Implemented in the edge middleware.
- **CSRF defence**: session cookie `sameSite` hardened from `"lax"` to
  `"strict"`. Added HMAC-based CSRF token infrastructure in `lib/security.ts`
  (`issueCsrfToken`/`verifyCsrfToken`) for future endpoint integration.
- **Password hashing centralised**: `lib/security.ts` provides
  `hashPassword`/`verifyPassword` using bcrypt cost 12 (was cost 10,
  duplicated across 3 files). Login, register, profile-update, and seed
  all use the centralised helpers.
- **Email-change re-verification**: changing email address on
  `PATCH /api/auth/me` now requires the current password (`currentPassword`
  field). Missing → 400; incorrect → 403; correct → 200.
- **Session invalidation on password change**: when a user changes their
  password, all existing sessions are destroyed and a fresh one is issued.
- **JWT role claim**: the session JWT now carries `{uid, sid, role}`,
  enabling the edge middleware to authorise `/admin` without a DB lookup.
  The DB `Session` row remains the source of truth for validity.
- **Security headers**: added `Permissions-Policy`, `X-XSS-Protection`,
  `X-DNS-Prefetch-Control` to the existing set (now 6 headers total).
- **Environment validation**: `lib/env.ts` validates `DATABASE_URL`,
  `JWT_SECRET` (≥32 chars), `SESSION_COOKIE_NAME`, `ADMIN_SEED_EMAIL` at
  startup. Throws loudly on misconfiguration.

#### Files
- New: `middleware.ts`, `lib/security.ts`, `lib/env.ts`
- Modified: `lib/auth.ts`, `lib/db.ts`, `app/api/auth/{login,register,me}/route.ts`,
  `app/api/admin/{customers/[id],products,hierarchy/[entity],master/[entity]}/route.ts`,
  `app/admin/AdminApp.tsx`, `next.config.mjs`, `prisma/seed.mjs`,
  19 storefront HTML files, `public/assets/js/account.js`
- Deleted: `public/index.html`

### Sprint 0 — Project Stabilisation (2026-07-21)

#### Security
- Rotated committed JWT secret and admin seed password; previous values
  (`nassim-prod-secret-...`, `Admin@12345`) are no longer valid.
- Created dedicated least-privilege PostgreSQL role `nassim_app`
  (NOSUPERUSER, NOCREATEDB, NOCREATEROLE) and dedicated `nassim` database.
  The application no longer connects as the `postgres` superuser to the
  `postgres` maintenance database.
- Created `.env.example` documenting all environment variables with safe
  placeholders and generation instructions.
- Confirmed `.env` is git-ignored and not tracked.

#### Bug fixes
- **Category slugs**: all 11 `Category.slug` values were display names
  containing spaces and `&` (e.g. `"Trolleys & Baskets"`), violating the
  `^[a-z0-9-]+$` slug contract. Fixed to URL-safe slugs
  (e.g. `"trolleys-baskets"`).
- **Department routing**: the `warehouse` (INQUIRY) department was empty
  because the seed compared display names against slug tokens. Fixed: 5
  categories now correctly assigned to `warehouse`, 6 to `houseware`.
- **Dummy cart**: `cart.html` shipped two hardcoded placeholder products
  ("Hand-Forged Damascus Knife", "Artisan Steel Fork Set") with Google
  stock images. Removed; first-time visitors now see the empty-cart state.
- **Brand leakage**: orphan pages carrying wrong brand names deleted
  (`advertisment.html` → "Atelier Nord", `cool.html` → "Arctic Precision",
  `cold.html` → "Arctic Bespoke"). No template-brand text remains.
- **Logo redirect**: homepage logo linked to `code.html` which 308-redirected
  to `/index.html`. Fixed to link directly to `/`.
- **Dead redirects**: removed 4 obsolete redirects from `next.config.mjs`
  (`code.html`, `code_temp.html`, `dummy12.html`, `house_temp.html`) that
  targeted non-existent files.

#### Seed idempotency
- Product seeding is now create-only: existing products are never overwritten
  on re-seed, so admin edits (price, images, flags) survive. The seed now
  reports "N created, M skipped" instead of silently clobbering.
- Admin user seeding no longer re-hashes the password if the user exists;
  only the role is refreshed.

#### UX
- Added SVG favicon (`public/favicon.svg`); linked from all 20 storefront
  HTML pages and configured in Next.js `app/layout.tsx` metadata.

#### Repository hygiene
- Removed 2 corrupted/truncated PNG files from `public/uploads/` (8 bytes
  each, not valid images).
- Reconciled `AGENTS.md.txt` (which claimed an incorrect stack including
  non-existent directories and Supabase Storage) into an accurate `AGENTS.md`
  reflecting the actual architecture.
- Confirmed `tsconfig.tsbuildinfo` is git-ignored (not tracked).

#### Database
- Migrated all data (198 rows across 27 tables) from the `postgres`
  maintenance database to the new dedicated `nassim` database with zero
  data loss.
- `prisma migrate status` confirms the schema is up to date — no new
  migration was required for Sprint 0.

#### Verification
- `npm run typecheck` — passes with zero errors.
- `npm run build` — succeeds; all 25 routes compile.
- Playwright smoke tests pass: homepage, cart empty state, favicon,
  categories API (all slugs valid), auth login, admin stats.
