# Feature Matrix

> Project: **nassim-platform** (AL-NASSIM)
> Audit date: 2026-07-21
> Source: derived from `docs/Project_Audit.md` and full codebase inspection
> Method: read-only — **no code was modified**

This document is a complete feature inventory. Every feature implemented (or
planned but missing) in the project is listed with status across all layers
and an estimated completion percentage.

---

## How to read this matrix

**Status vocabulary**
- **Complete** — implemented and functional for its current scope.
- **Partial** — functional but with gaps, bugs, or missing sub-features.
- **Stub** — defined (schema/UI placeholder) but no working logic.
- **Missing** — not implemented at all.
- **Not Required** — does not apply to this feature (e.g. admin UI for a customer-only flow).
- **Dead** — code exists but is never executed.

**Priority vocabulary**
- **Critical** — blocks production launch or has security impact.
- **High** — major functionality gap or significant UX issue.
- **Medium** — quality, scalability, or completeness issue.
- **Low** — polish, optimisation, or non-blocking improvement.

**Layer legend**
- **FE** = Frontend (storefront `public/` and/or admin `app/admin/`)
- **BE** = Backend API (`app/api/`)
- **DB** = Database (`prisma/`)
- **ADM** = Admin panel UI
- **TST** = Automated tests

---

## Summary scorecard

| Domain | Features | Avg. completion |
|---|:-:|---:|
| 1. Authentication & Authorization | 9 | ~55% |
| 2. Catalog & Products | 13 | ~65% |
| 3. Shopping (Cart, Wishlist, Checkout) | 9 | ~55% |
| 4. Orders & Payments | 9 | ~55% |
| 5. Customer Account | 5 | ~45% |
| 6. Admin Panel | 11 | ~55% |
| 7. Search & Filtering | 4 | ~55% |
| 8. Internationalization & UX | 4 | ~30% |
| 9. SEO | 4 | ~5% |
| 10. Media & File Management | 3 | ~45% |
| 11. Security | 7 | ~50% |
| 12. Observability & Comms | 4 | ~0% |
| 13. Engineering Quality & DevOps | 8 | ~25% |
| **Overall** | **90** | **~55%** |

---

## 1. Authentication & Authorization

### 1.1 User Registration
- **Description:** Customers create an account with name/email/password/phone.
- **Frontend:** Complete — `public/assets/js/account.js:276`.
- **Backend:** Complete — `app/api/auth/register/route.ts` (Zod, bcrypt, session creation).
- **Database:** Complete — `User` model.
- **Admin:** Not Required.
- **Testing:** Missing.
- **Dependencies:** bcryptjs, jsonwebtoken, `lib/auth.ts`.
- **Missing Items:** No rate limiting (spam-account risk); no email verification; no password complexity rules beyond length 8.
- **Priority:** Medium.
- **Completion:** **85%**

### 1.2 User Login
- **Description:** Email/password sign-in issuing a session cookie.
- **Frontend:** Complete — `account.js:241`.
- **Backend:** Partial — `app/api/auth/login/route.ts`. Generic 401 (no enumeration leak), but no rate limiting.
- **Database:** Complete.
- **Admin:** Not Required.
- **Testing:** Missing.
- **Dependencies:** bcryptjs, jsonwebtoken.
- **Missing Items:** Brute-force protection / lockout; CAPTCHA; "remember me" toggle; account-activation flow.
- **Priority:** Critical (no rate limiting on a public endpoint).
- **Completion:** **70%**

### 1.3 User Logout
- **Description:** Destroys the session row and clears the cookie.
- **Frontend:** Complete — `account.js:353`.
- **Backend:** Complete — `app/api/auth/logout/route.ts`.
- **Database:** Complete (deletes `Session` row).
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** None functional.
- **Priority:** Low.
- **Completion:** **95%**

### 1.4 User Profile (view/edit)
- **Description:** Logged-in users view and update name/email/phone/password.
- **Frontend:** Complete — `account.js` profile UI.
- **Backend:** Partial — `GET`/`PATCH /api/auth/me`. PATCH allows email change without re-verifying password.
- **Database:** Complete.
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** Password re-verification on email change; avatar upload; account deletion.
- **Priority:** Medium.
- **Completion:** **75%**

### 1.5 Session Management
- **Description:** Hybrid design — DB `Session` row is source of truth; JWT cookie carries `{uid, sid}`.
- **Frontend:** N/A (cookie auto-sent by browser).
- **Backend:** Complete — `lib/auth.ts` (create/get/destroy, expiry check, `isActive` check).
- **Database:** Complete — `Session` model with `expiresAt`, indexed.
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** No session-limit cap; 30-day window is long; no refresh/rotation.
- **Priority:** Low.
- **Completion:** **90%**

### 1.6 Admin Authorization (`requireStaff`)
- **Description:** Gate that admits `ADMIN` or `STAFF` users on `/api/admin/*`.
- **Frontend:** N/A.
- **Backend:** Partial — `lib/auth.ts:66-70`. Used by every admin route, but collapses the two roles.
- **Database:** Complete — `UserRole` enum.
- **Admin:** Partial — `AdminApp.tsx:90` does a client-side role check.
- **Testing:** Missing.
- **Missing Items:** No `requireAdmin`; STAFF can do everything ADMIN can; no server-side gate at layout/middleware level.
- **Priority:** High.
- **Completion:** **55%**

### 1.7 Rate Limiting / Brute-Force Protection
- **Description:** Throttle repeated auth attempts and abusive endpoints.
- **Frontend:** Missing.
- **Backend:** Missing — no `middleware.ts`, no throttle code anywhere.
- **Database:** Not Required.
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** Entire feature; no IP throttling, no lockout, no CAPTCHA.
- **Priority:** Critical.
- **Completion:** **0%**

### 1.8 Password Reset / Forgot Password
- **Description:** Email-based password recovery flow.
- **Frontend:** Missing.
- **Backend:** Missing.
- **Database:** Missing (no `passwordResetToken` field).
- **Admin:** Missing.
- **Testing:** Missing.
- **Missing Items:** Entire feature; no email provider wired up to deliver reset links.
- **Priority:** High.
- **Completion:** **0%**

### 1.9 Email Verification
- **Description:** Verify the user controls their declared email at sign-up.
- **Frontend:** Missing.
- **Backend:** Missing.
- **Database:** Missing (no `emailVerifiedAt` field).
- **Admin:** Missing.
- **Testing:** Missing.
- **Missing Items:** Entire feature.
- **Priority:** Medium.
- **Completion:** **0%**

---

## 2. Catalog & Products

### 2.1 DB-Driven Product Catalog
- **Description:** Authoritative product list served from PostgreSQL via `/api/catalog` (returns JS that sets `window.NASSIM_PRODUCTS`) and `/api/products`.
- **Frontend:** Partial — consumed by `product-nav.js`, `product view.html`, `kitchenware.html`; not used by `forklift.html`/`rack.html`/`trolly.html`.
- **Backend:** Complete.
- **Database:** Complete — `Product` model with 38 columns.
- **Admin:** Partial — admin can create but not edit/delete from UI.
- **Testing:** Missing.
- **Dependencies:** `/api/catalog`, `/api/products`.
- **Missing Items:** Catalog has no caching (`force-dynamic`); product content is JS-rendered (invisible to crawlers).
- **Priority:** High.
- **Completion:** **75%**

### 2.2 Static Fallback Catalog (`products.js`)
- **Description:** Hardcoded 67-product array used as fallback when the API fails and as the seed source.
- **Frontend:** Complete (`public/assets/js/products.js`) but uses Google stock images.
- **Backend:** N/A.
- **Database:** N/A — seed reads from it (`prisma/seed.mjs`).
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** Will drift from DB; uses external image URLs.
- **Priority:** Low (should be removed or generated from DB).
- **Completion:** **70%**

### 2.3 Inline Catalog Pages (siloed)
- **Description:** `forklift.html`, `rack.html`, `trolly.html` each embed their own product array with local image paths.
- **Frontend:** Partial — works in isolation, will drift from DB.
- **Backend:** Not used.
- **Database:** Not used.
- **Admin:** Not editable from UI.
- **Testing:** Missing.
- **Missing Items:** Should be migrated to DB-driven rendering.
- **Priority:** Medium (data-drift hazard).
- **Completion:** **40%**

### 2.4 Product Detail Page
- **Description:** `product view.html` renders title, SKU, price, description, gallery, specs, breadcrumb, related products.
- **Frontend:** Partial — uses `document.write` fallback; filename has a literal space (`product view.html`).
- **Backend:** Complete (`GET /api/products/[slug]`).
- **Database:** Complete.
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** Filename should be URL-safe; not-found UX is harsh (replaces `<main>`).
- **Priority:** Medium.
- **Completion:** **70%**

### 2.5 Product Image Gallery & Zoom
- **Description:** Multi-image gallery with thumbnail switch, magnifier lens, and zoom.
- **Frontend:** Complete — `product view.html:322-337`.
- **Backend:** N/A.
- **Database:** Partial — `ProductImage` table exists but storefront reads `Product.image`/`images` instead.
- **Admin:** Partial — gallery editor writes `ProductImage`, but storefront does not consume it.
- **Testing:** Missing.
- **Missing Items:** Reconcile the three overlapping image stores (`Product.image`, `Product.images[]`, `ProductImage`).
- **Priority:** Medium.
- **Completion:** **65%**

### 2.6 Related Products
- **Description:** "You may also like" section on product detail.
- **Frontend:** Complete — `product view.html:288-319`. Priority: admin-selected → same section → same department → fallback.
- **Backend:** Partial (computed client-side from `window.NASSIM_PRODUCTS`).
- **Database:** Complete (relations exist).
- **Admin:** Partial (no UI to set related products explicitly).
- **Testing:** Missing.
- **Missing Items:** Server-side recommendation endpoint.
- **Priority:** Low.
- **Completion:** **70%**

### 2.7 Category Navigation
- **Description:** Mega-menu and category landing pages.
- **Frontend:** Partial — some categories DB-driven, others static; mega-menu has dead `href="#"` links ("Customized Packaging", "Cold Rooms").
- **Backend:** Complete (`/api/categories`).
- **Database:** Complete — `Department`, `Category`.
- **Admin:** Partial (admin can manage categories, but seed bug routes all to `houseware`).
- **Testing:** Missing.
- **Missing Items:** Wire all category pages to DB; remove dead nav links; fix seed department routing.
- **Priority:** High.
- **Completion:** **55%**

### 2.8 Departments / Sections / Subcategories Hierarchy
- **Description:** Three-level catalog taxonomy.
- **Frontend:** Partial — `Section`/`Subcategory` not surfaced on storefront.
- **Backend:** Complete (`/api/admin/hierarchy/[entity]`).
- **Database:** Complete — `Department`, `Section`, `Category`, `Subcategory`.
- **Admin:** Complete — full CRUD via `MasterDataPanel`.
- **Testing:** Missing.
- **Missing Items:** Storefront surfacing of sections; subcategory dropdown not parent-filtered in admin (`MasterDataPanel.tsx:544-556`).
- **Priority:** Medium.
- **Completion:** **65%**

### 2.9 Master Data CRUD (12 entities)
- **Description:** Admin CRUD for brands, materials, colors, sizes, suppliers, units, countries, taxes (+ hierarchy entities).
- **Frontend:** N/A (admin only).
- **Backend:** Complete (`/api/admin/master/[entity]`, `/api/admin/hierarchy/[entity]`).
- **Database:** Complete — all lookup tables.
- **Admin:** Complete — `MasterDataPanel.tsx` (580 lines, schema-driven).
- **Testing:** Missing.
- **Missing Items:** Dead `multiselect` field type declared but never rendered; `defaultOrderBy` config unused.
- **Priority:** Low.
- **Completion:** **90%**

### 2.10 Product Variants (Colors / Sizes)
- **Description:** Many-to-many product ↔ color/size via join tables.
- **Frontend:** Partial — color/unit filter checkboxes on category pages have no JS handler.
- **Backend:** Complete (admin POST/PATCH connects colors/sizes).
- **Database:** Complete — `ProductColor`, `ProductSize`.
- **Admin:** Complete — multiselect in `ProductsTab`.
- **Testing:** Missing.
- **Missing Items:** Variant-aware pricing/inventory; storefront color/size selection on PDP.
- **Priority:** Medium.
- **Completion:** **60%**

### 2.11 Product Specifications (JSON)
- **Description:** Free-form `specs` JSON field on Product.
- **Frontend:** Partial — rendered on PDP from `specs` array.
- **Backend:** Complete — stored as `Json`, parsed with silent `[]` fallback on bad input.
- **Database:** Complete — `Product.specs Json`.
- **Admin:** Partial — free-text JSON input in form.
- **Testing:** Missing.
- **Missing Items:** Structured specs editor; server-side schema validation.
- **Priority:** Low.
- **Completion:** **60%**

### 2.12 Product SEO Fields
- **Description:** `seoTitle`, `seoDescription`, `tags` on Product.
- **Frontend:** Missing — PDP does not emit `<meta>` tags from these fields.
- **Backend:** Complete (stored/returned).
- **Database:** Complete.
- **Admin:** Complete — fields in `ProductsTab` form.
- **Testing:** Missing.
- **Missing Items:** Server-side rendering of `<title>`/`<meta>` from `seoTitle`/`seoDescription`; tag-based filtering.
- **Priority:** High (part of SEO gap).
- **Completion:** **40%**

### 2.13 Stock Status
- **Description:** Per-product stock count, `minStock`, `StockStatus` enum (`IN_STOCK`, `LOW_STOCK`, etc.).
- **Frontend:** Missing — status not surfaced on storefront.
- **Backend:** Partial — `/api/admin/stats` reports low-stock (≤10); order placement decrements stock.
- **Database:** Complete — `stock`, `minStock`, `stockStatus`.
- **Admin:** Partial — `stats` low-stock list; no manual stock adjustment UI.
- **Testing:** Missing.
- **Missing Items:** Storefront "in stock" badges; admin stock-adjustment that writes `StockMovement`.
- **Priority:** Medium.
- **Completion:** **55%**

---

## 3. Shopping (Cart, Wishlist, Checkout)

### 3.1 Shopping Cart (localStorage)
- **Description:** Guest and user cart persisted in `localStorage` under `nassim_cart`.
- **Frontend:** Partial — `cart.html`. Ships with two dummy items; "wishlist" button on rows only toggles icon.
- **Backend:** Not used by storefront.
- **Database:** Not used by storefront.
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** Remove dummy defaults; fix row-wishlist bug; persist quantity across reloads reliably.
- **Priority:** High.
- **Completion:** **55%**

### 3.2 Server Cart API
- **Description:** `/api/cart` GET/POST/DELETE — DB-backed cart for logged-in users.
- **Frontend:** Missing — storefront never calls it.
- **Backend:** Partial — works, but POST upsert **replaces** quantity (not increment); no stock check.
- **Database:** Complete — `CartItem` model with unique `(userId, productId)`.
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** Wire storefront to server cart; correct upsert semantics; enforce stock.
- **Priority:** High.
- **Completion:** **45%**

### 3.3 Cart Badge Sync
- **Description:** Header cart count reflects current item count across pages.
- **Frontend:** Partial — `cart-nav.js`. Updated on `cart.html` and `product view.html`; **not** on home/category pages (stays `00`).
- **Backend:** N/A.
- **Database:** N/A.
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** Global badge update on all pages.
- **Priority:** Medium.
- **Completion:** **50%**

### 3.4 Wishlist (localStorage + Server Sync)
- **Description:** Persist wishlist locally and mirror to server when logged in.
- **Frontend:** Complete — `wishlist.html`, `product view.html:199-222`. Cross-tab sync via `storage` event.
- **Backend:** Complete — `/api/wishlist` GET/POST/DELETE.
- **Database:** Complete — `WishlistItem` unique `(userId, productId)`.
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** Wishlist share; price-drop notifications.
- **Priority:** Low.
- **Completion:** **90%**

### 3.5 Move Wishlist → Cart
- **Description:** Move an item from wishlist into the cart.
- **Frontend:** Complete — `wishlist.html:444-465`.
- **Backend:** N/A (localStorage operation).
- **Database:** N/A.
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** None functional.
- **Priority:** Low.
- **Completion:** **90%**

### 3.6 Checkout
- **Description:** Collect customer info, show order summary, submit order (COD).
- **Frontend:** Partial — `checkout.html`, `checkout.js`. Hardcoded shipping `2.500 KD`.
- **Backend:** Partial — `POST /api/orders` works but trusts client `shipping`.
- **Database:** Complete — `Order`, `OrderItem`, `OrderStatusEvent`.
- **Admin:** Not Required (orders visible in admin).
- **Testing:** Missing.
- **Missing Items:** Server-authoritative shipping/totals; address selection; coupon/discount code entry.
- **Priority:** Critical.
- **Completion:** **55%**

### 3.7 Order Totals & Pricing
- **Description:** Compute subtotal/shipping/total.
- **Frontend:** Partial — client displays hardcoded shipping.
- **Backend:** Partial — subtotal recomputed server-side from DB prices (good), but shipping trusted from client.
- **Database:** Complete — `Decimal(10,3)` columns.
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** Server-side shipping rules; tax computation; discount application.
- **Priority:** Critical.
- **Completion:** **55%**

### 3.8 Quantity / Remove Controls (Cart)
- **Description:** +/- buttons, remove buttons on cart rows.
- **Frontend:** Complete — `cart.html:269-289` (event delegation).
- **Backend:** N/A (localStorage).
- **Database:** N/A.
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** Min-quantity validation against DB stock.
- **Priority:** Low.
- **Completion:** **85%**

### 3.9 Mini-Cart / Cart Drawer
- **Description:** Slide-out cart accessible from any page.
- **Frontend:** Missing — only a badge; no drawer.
- **Backend:** N/A.
- **Database:** N/A.
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** Entire feature.
- **Priority:** Low.
- **Completion:** **0%**

---

## 4. Orders & Payments

### 4.1 Order Placement
- **Description:** Submit an order with items + customer info.
- **Frontend:** Complete — `checkout.js:50`.
- **Backend:** Partial — `app/api/orders/route.ts`. Validates items, recomputes subtotal, decrements stock; but **stock check sits outside the transaction** (race/oversell) and `shipping` is trusted.
- **Database:** Complete.
- **Admin:** Read-only visibility.
- **Testing:** Missing.
- **Missing Items:** Transactional stock check; server-side shipping; idempotency key to prevent double-submit.
- **Priority:** Critical.
- **Completion:** **60%**

### 4.2 Guest Checkout
- **Description:** Place orders without an account (`Order.userId` nullable).
- **Frontend:** Complete.
- **Backend:** Complete (`orders/route.ts:67` reads `user?.id ?? null`).
- **Database:** Complete — `Order.userId Int?`.
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** Guest → registered conversion prompt.
- **Priority:** Low.
- **Completion:** **90%**

### 4.3 Order Number Generation
- **Description:** Unique human-readable order number `AN-<year>-<padded id>`.
- **Frontend:** N/A.
- **Backend:** Partial — placeholder set on create then second UPDATE writes real number.
- **Database:** Complete — `Order.orderNumber` unique.
- **Admin:** Visible.
- **Testing:** Missing.
- **Missing Items:** Single-step insert; collision-safe generation.
- **Priority:** Low.
- **Completion:** **80%**

### 4.4 Order History (Customer)
- **Description:** "My Orders" page listing the user's past orders.
- **Frontend:** Complete — `account.js:164`.
- **Backend:** Complete — `GET /api/orders` (own orders only).
- **Database:** Complete.
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** Order detail view; reorder; invoice download.
- **Priority:** Low.
- **Completion:** **80%**

### 4.5 Order Status Timeline
- **Description:** Per-order history of status changes with timestamps/notes.
- **Frontend:** Missing — admin shows current status only.
- **Backend:** Partial — `OrderStatusEvent` written on every change but no read endpoint.
- **Database:** Complete — `OrderStatusEvent` model.
- **Admin:** Missing — no timeline UI.
- **Testing:** Missing.
- **Missing Items:** Read API for status events; admin/customer timeline UI.
- **Priority:** Medium.
- **Completion:** **35%**

### 4.6 Order Status Management (Admin)
- **Description:** Move orders through `PENDING → CONFIRMED → … → DELIVERED`.
- **Frontend:** Partial — `AdminApp.tsx` OrdersTab; status buttons (8 statuses, missing `REFUNDED`).
- **Backend:** Partial — `PATCH /api/admin/orders`; **no state machine** (any transition allowed).
- **Database:** Complete — `OrderStatus` enum (9 values).
- **Admin:** Partial.
- **Testing:** Missing.
- **Missing Items:** State-machine enforcement; `REFUNDED` button; customer email notifications on transition.
- **Priority:** High.
- **Completion:** **55%**

### 4.7 Payment — Cash on Delivery (COD)
- **Description:** Pay with cash on delivery; no online gateway.
- **Frontend:** Complete — COD badge shown; no card form.
- **Backend:** Complete — order note "Order placed (cash on delivery)".
- **Database:** Complete (no payment tables needed for COD).
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** None for COD scope.
- **Priority:** Low.
- **Completion:** **95%**

### 4.8 Online Payment Gateway
- **Description:** Card/KNET/Stripe-style online payment.
- **Frontend:** Missing.
- **Backend:** Missing.
- **Database:** Missing (no `Payment` model).
- **Admin:** Missing.
- **Testing:** Missing.
- **Missing Items:** Entire feature — no Stripe/KNET/Tap/Checkout.com integration.
- **Priority:** Critical for paid online sales.
- **Completion:** **0%**

### 4.9 Refunds / Cancellations
- **Description:** Refund or cancel an order with money movement.
- **Frontend:** Missing.
- **Backend:** Missing — `REFUNDED` enum value exists but no logic.
- **Database:** Partial — enum value present.
- **Admin:** Missing — no refund button.
- **Testing:** Missing.
- **Missing Items:** Refund flow, gateway integration, stock restoration on cancel.
- **Priority:** High.
- **Completion:** **10%**

---

## 5. Customer Account

### 5.1 Account Dashboard
- **Description:** Landing page for logged-in users (profile, orders, addresses).
- **Frontend:** Partial — `account.js` shows profile + orders; no addresses.
- **Backend:** Partial.
- **Database:** Complete.
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** Addresses tab, wallet, loyalty, communication preferences.
- **Priority:** Medium.
- **Completion:** **55%**

### 5.2 Saved Addresses
- **Description:** CRUD for shipping addresses with a default flag.
- **Frontend:** Missing — no UI.
- **Backend:** Missing — no `/api/addresses` route.
- **Database:** Complete — `Address` model.
- **Admin:** Partial — admin can view customer addresses; cannot edit.
- **Testing:** Missing.
- **Missing Items:** API + UI; single-default enforcement.
- **Priority:** High.
- **Completion:** **25%**

### 5.3 Order Reorder
- **Description:** One-click re-add past order items to cart.
- **Frontend:** Missing.
- **Backend:** Missing.
- **Database:** N/A (data is available).
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** Entire feature.
- **Priority:** Low.
- **Completion:** **0%**

### 5.4 Account Deletion / Data Export
- **Description:** GDPR-style self-service account deletion or data export.
- **Frontend:** Missing.
- **Backend:** Missing.
- **Database:** Missing.
- **Admin:** Missing.
- **Testing:** Missing.
- **Missing Items:** Entire feature.
- **Priority:** Low.
- **Completion:** **0%**

### 5.5 Customer Activation / Deactivation (Admin)
- **Description:** Admin toggles `isActive` on a customer to block login.
- **Frontend:** Complete — `CustomersTab.tsx:106-117`.
- **Backend:** Complete — `PATCH /api/admin/customers/[id]`.
- **Database:** Complete — `User.isActive`.
- **Admin:** Complete.
- **Testing:** Missing.
- **Missing Items:** No Zod on PATCH; STAFF can deactivate ADMIN users.
- **Priority:** Medium.
- **Completion:** **80%**

---

## 6. Admin Panel

### 6.1 Admin Authentication / Login Screen
- **Description:** Dedicated admin sign-in.
- **Frontend:** Missing — no admin login page; relies on storefront sign-in.
- **Backend:** Partial (uses shared `/api/auth/*`).
- **Database:** N/A.
- **Admin:** Missing.
- **Testing:** Missing.
- **Missing Items:** Dedicated admin login route; 2FA for admins.
- **Priority:** High.
- **Completion:** **20%**

### 6.2 Admin Auth Gate
- **Description:** Block non-staff from `/admin` routes.
- **Frontend:** Partial — client-side `fetch /api/auth/me` only.
- **Backend:** Partial — per-route `requireStaff()`; no server gate at layout.
- **Database:** N/A.
- **Admin:** Partial.
- **Testing:** Missing.
- **Missing Items:** Server-side gate via `middleware.ts`; redirect-on-unauth.
- **Priority:** High.
- **Completion:** **40%**

### 6.3 Admin Dashboard / Stats
- **Description:** KPI cards (orders, revenue, products, customers), orders-by-status, top products, low-stock, recent orders.
- **Frontend:** Complete — `AdminApp.tsx` DashboardTab.
- **Backend:** Complete — `/api/admin/stats` (8 aggregations).
- **Database:** Complete.
- **Admin:** Complete.
- **Testing:** Missing.
- **Missing Items:** Revenue counts non-cancelled orders regardless of payment status (may overstate); no date-range filter.
- **Priority:** Low.
- **Completion:** **85%**

### 6.4 Admin Product Management
- **Description:** CRUD for products with master-data dropdowns, variants, media library.
- **Frontend:** Partial — `ProductsTab.tsx`. Create form rich; **no edit, no delete UI**; dead `filteredSubcategories` code.
- **Backend:** Complete — `GET/POST/PATCH/DELETE /api/admin/products` (DELETE is soft).
- **Database:** Complete.
- **Admin:** Partial.
- **Testing:** Missing.
- **Missing Items:** Edit/delete UI; bulk operations; product duplication; pagination.
- **Priority:** Critical.
- **Completion:** **45%**

### 6.5 Admin Order Management
- **Description:** List orders, filter by status, change status, view detail.
- **Frontend:** Partial — list + expandable detail + status change.
- **Backend:** Partial — `GET/PATCH /api/admin/orders`. GET caps at `take: 200`, no pagination.
- **Database:** Complete.
- **Admin:** Partial.
- **Testing:** Missing.
- **Missing Items:** Pagination/search; state machine; refunds; invoice PDF; customer notification on status change.
- **Priority:** High.
- **Completion:** **55%**

### 6.6 Admin Customer Management
- **Description:** List customers, view detail (addresses, order history), activate/deactivate.
- **Frontend:** Partial — list + detail + activate/deactivate.
- **Backend:** Partial — `GET /api/admin/customers`, `GET/PATCH /api/admin/customers/[id]`. No Zod on PATCH; no create/edit/role-change/delete.
- **Database:** Complete.
- **Admin:** Partial.
- **Testing:** Missing.
- **Missing Items:** Customer create/edit, role assignment, order placement on behalf of customer, customer notes.
- **Priority:** Medium.
- **Completion:** **55%**

### 6.7 Admin Hierarchy Management
- **Description:** CRUD for Departments, Sections, Categories, Subcategories.
- **Frontend:** Complete.
- **Backend:** Complete — `/api/admin/hierarchy/[entity]` full CRUD with audit log.
- **Database:** Complete.
- **Admin:** Complete.
- **Testing:** Missing.
- **Missing Items:** DELETE misclassifies "not found" as "in use"; subcategory parent filtering.
- **Priority:** Low.
- **Completion:** **85%**

### 6.8 Admin Master Data Management
- **Description:** CRUD for 8 lookup entities (brands, materials, colors, sizes, units, suppliers, countries, taxes).
- **Frontend:** Complete.
- **Backend:** Complete — `/api/admin/master/[entity]` full CRUD via dynamic Prisma delegate.
- **Database:** Complete.
- **Admin:** Complete.
- **Testing:** Missing.
- **Missing Items:** Type-safety improvement (remove `as unknown as Record<...>` casts).
- **Priority:** Low.
- **Completion:** **90%**

### 6.9 Admin Media Library / Upload
- **Description:** Drag-drop image upload, gallery reorder, set primary, remove.
- **Frontend:** Complete — `ProductsTab.tsx` upload UI.
- **Backend:** Complete — `POST /api/admin/upload` (8 MiB, MIME allowlist).
- **Database:** Partial — `ProductImage` written by admin only.
- **Admin:** Complete (within Products).
- **Testing:** Missing.
- **Missing Items:** Cloud storage (Supabase/S3); magic-number content sniff; reuse library across products.
- **Priority:** Medium.
- **Completion:** **70%**

### 6.10 Admin Audit Log
- **Description:** Append-only record of admin mutations.
- **Frontend:** Missing — no UI.
- **Backend:** Complete — every admin mutation calls `auditLog.create`.
- **Database:** Complete — `AuditLog` model, indexed on `entity`.
- **Admin:** Missing — no viewer.
- **Testing:** Missing.
- **Missing Items:** Admin UI to search/filter audit log; export.
- **Priority:** Medium.
- **Completion:** **45%**

### 6.11 Admin Settings Management
- **Description:** Edit key/value settings (shipping fee, currency).
- **Frontend:** Missing — no UI.
- **Backend:** Missing — no `/api/admin/settings` route.
- **Database:** Partial — `Setting` model exists with 2 seeded rows (not read by checkout).
- **Admin:** Missing.
- **Testing:** Missing.
- **Missing Items:** API + UI; wire checkout to read `shipping_fee` from Settings.
- **Priority:** Medium.
- **Completion:** **15%**

---

## 7. Search & Filtering

### 7.1 Global Search Overlay
- **Description:** Debounced search modal querying `/api/products`.
- **Frontend:** Complete — `search.js:115-118` (150ms debounce).
- **Backend:** Complete — `GET /api/products?q=`.
- **Database:** Complete (Prisma `contains` on name/desc/sku/line).
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** Full-text search (Postgres `tsvector`); typo tolerance; search analytics.
- **Priority:** Low.
- **Completion:** **80%**

### 7.2 Category Filters (sort + price)
- **Description:** On category pages: sort (asc/desc), price range, custom min/max.
- **Frontend:** Partial — wired on `kitchenware.html:666-712`.
- **Backend:** N/A (client-side filter on `window.NASSIM_PRODUCTS`).
- **Database:** N/A.
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** Server-side filtering for pagination at scale.
- **Priority:** Medium.
- **Completion:** **70%**

### 7.3 Color / Unit Filters
- **Description:** Filter products by color or unit on category pages.
- **Frontend:** Stub — checkboxes render but **no JS handler** (`kitchenware.html:398-406, 684-685`).
- **Backend:** Missing.
- **Database:** Available (`ProductColor`, `Unit`).
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** Wire filter handlers; server endpoint.
- **Priority:** Medium.
- **Completion:** **15%**

### 7.4 Tag / Brand / Material Filtering
- **Description:** Faceted navigation by tags, brand, material.
- **Frontend:** Missing.
- **Backend:** Missing (no faceted query endpoint).
- **Database:** Available (`Product.tags[]`, `Brand`, `Material`).
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** Entire feature.
- **Priority:** Low.
- **Completion:** **0%**

---

## 8. Internationalization & UX

### 8.1 Arabic / RTL Support
- **Description:** Bilingual EN/AR UI with right-to-left layout.
- **Frontend:** Missing — every page `<html lang="en">`; `EN|AR` toggle is decorative (no handler).
- **Backend:** Missing.
- **Database:** Missing (no translation tables / JSON i18n fields).
- **Admin:** Missing.
- **Testing:** Missing.
- **Missing Items:** Entire feature — mandated by `AGENTS.md.txt`.
- **Priority:** Critical for Kuwait market.
- **Completion:** **0%**

### 8.2 Localization (i18n framework)
- **Description:** String translation pipeline.
- **Frontend:** Missing — no `next-intl`, `react-i18next`, etc.
- **Backend:** Missing.
- **Database:** Missing.
- **Admin:** Missing.
- **Testing:** Missing.
- **Missing Items:** i18n library; translation files; per-page string extraction.
- **Priority:** Critical (paired with 8.1).
- **Completion:** **0%**

### 8.3 Multi-currency
- **Description:** Display prices in multiple currencies.
- **Frontend:** Missing — KD hardcoded, 3-decimal format.
- **Backend:** Partial — `currency` field exists but unused.
- **Database:** Partial — `Product.currency`, `Order.currency`.
- **Admin:** Partial — `currency` in admin form.
- **Testing:** Missing.
- **Missing Items:** Currency switcher; FX rates.
- **Priority:** Low.
- **Completion:** **20%**

### 8.4 Responsive Design
- **Description:** Mobile/tablet/desktop layouts.
- **Frontend:** Partial — viewport meta on every page; Tailwind `md:`/`lg:` breakpoints. Same CDN caveat.
- **Backend:** N/A.
- **Database:** N/A.
- **Admin:** Partial — admin layout not stress-tested on mobile.
- **Testing:** Missing — no responsive test suite.
- **Missing Items:** Tailwind via build (not CDN); mobile nav verification.
- **Priority:** Medium.
- **Completion:** **70%**

---

## 9. SEO

### 9.1 Per-Page Meta Tags
- **Description:** `<title>`, `<meta name="description">` per page.
- **Frontend:** Missing — homepage title is just `"AL-NASSIM"`; no descriptions; some titles wrong-brand ("Arctic Precision").
- **Backend:** Missing — no metadata API used.
- **Database:** Available (`Product.seoTitle`, `Product.seoDescription`) but not rendered.
- **Admin:** Complete (fields exist in form).
- **Testing:** Missing.
- **Missing Items:** Server-rendered metadata from DB; templated titles.
- **Priority:** High.
- **Completion:** **15%**

### 9.2 Open Graph / Twitter Cards
- **Description:** Social share previews.
- **Frontend:** Missing — zero `og:` or `twitter:` tags.
- **Backend:** Missing.
- **Database:** Missing.
- **Admin:** Missing.
- **Testing:** Missing.
- **Missing Items:** Entire feature.
- **Priority:** Medium.
- **Completion:** **0%**

### 9.3 Sitemap & Robots
- **Description:** `sitemap.xml` and `robots.txt`.
- **Frontend:** Missing — neither file in `public/`.
- **Backend:** Missing.
- **Database:** N/A.
- **Admin:** Missing.
- **Testing:** Missing.
- **Missing Items:** Entire feature.
- **Priority:** High.
- **Completion:** **0%**

### 9.4 Structured Data (JSON-LD)
- **Description:** Product/organization schema.org markup.
- **Frontend:** Missing — zero `application/ld+json` blocks.
- **Backend:** Missing.
- **Database:** Available.
- **Admin:** Not Required.
- **Testing:** Missing.
- **Missing Items:** Entire feature.
- **Priority:** Medium.
- **Completion:** **0%**

---

## 10. Media & File Management

### 10.1 File Upload (Local)
- **Description:** Admin-only image upload to `public/uploads/`.
- **Frontend:** Complete — drag-drop in `ProductsTab.tsx`.
- **Backend:** Partial — works for self-hosted; MIME is client-trusted; no content sniff.
- **Database:** N/A (URLs stored on `ProductImage`).
- **Admin:** Complete.
- **Testing:** Missing.
- **Missing Items:** Magic-number validation; image re-encoding; fails on serverless/read-only FS.
- **Priority:** Medium.
- **Completion:** **65%**

### 10.2 Cloud Storage (Supabase / S3)
- **Description:** Object storage for media — declared in `AGENTS.md.txt`.
- **Frontend:** Missing.
- **Backend:** Missing.
- **Database:** N/A.
- **Admin:** Missing.
- **Testing:** Missing.
- **Missing Items:** Entire feature.
- **Priority:** High (deployment-blocker).
- **Completion:** **0%**

### 10.3 Image Optimization
- **Description:** Responsive images via `next/image` or similar.
- **Frontend:** Missing — uses raw `<img>` tags everywhere.
- **Backend:** Missing — `images` not configured in `next.config.mjs`.
- **Database:** N/A.
- **Admin:** Missing.
- **Testing:** Missing.
- **Missing Items:** Entire feature.
- **Priority:** Medium.
- **Completion:** **0%**

---

## 11. Security

### 11.1 SQL Injection Prevention
- **Description:** All DB access via Prisma parameterized queries.
- **Frontend:** N/A.
- **Backend:** Complete — zero `$queryRaw`/`$executeRaw` calls.
- **Database:** N/A.
- **Admin:** N/A.
- **Testing:** Missing.
- **Missing Items:** None.
- **Priority:** Low.
- **Completion:** **100%**

### 11.2 Input Validation (Zod)
- **Description:** Schema validation on every mutation endpoint.
- **Frontend:** Partial — client-side validation in admin forms.
- **Backend:** Complete (except `admin/customers/[id]` PATCH).
- **Database:** N/A.
- **Admin:** N/A.
- **Testing:** Missing.
- **Missing Items:** Zod on the customers PATCH; shared schema registry.
- **Priority:** Low.
- **Completion:** **90%**

### 11.3 Secret Management
- **Description:** Secrets out of source, rotated, in a vault.
- **Frontend:** N/A.
- **Backend:** Missing — `.env` is committed in the snapshot with weak values.
- **Database:** Missing — DB password `apple123`, admin password `Admin@12345`.
- **Admin:** N/A.
- **Testing:** Missing.
- **Missing Items:** Rotate all secrets; use secret manager.
- **Priority:** Critical.
- **Completion:** **15%**

### 11.4 Security Headers
- **Description:** HTTP security headers.
- **Frontend:** N/A.
- **Backend:** Partial — `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` in `next.config.mjs`.
- **Database:** N/A.
- **Admin:** N/A.
- **Testing:** Missing.
- **Missing Items:** CSP, HSTS, Permissions-Policy.
- **Priority:** Medium.
- **Completion:** **50%**

### 11.5 CSRF Protection
- **Description:** Anti-CSRF tokens for state-changing requests.
- **Frontend:** Missing.
- **Backend:** Missing — relies solely on `sameSite=lax`.
- **Database:** N/A.
- **Admin:** Missing.
- **Testing:** Missing.
- **Missing Items:** CSRF token issuance/validation.
- **Priority:** High.
- **Completion:** **10%**

### 11.6 Password Hashing
- **Description:** bcrypt with cost factor.
- **Frontend:** N/A.
- **Backend:** Complete — `bcryptjs` cost 10 in register/login/seed.
- **Database:** N/A.
- **Admin:** N/A.
- **Testing:** Missing.
- **Missing Items:** Centralised hashing helper (currently duplicated in 3 places); cost 12.
- **Priority:** Low.
- **Completion:** **80%**

### 11.7 Role-Based Access Control
- **Description:** Distinct CUSTOMER / STAFF / ADMIN capabilities.
- **Frontend:** Partial.
- **Backend:** Partial — only `requireStaff()`; STAFF ≡ ADMIN.
- **Database:** Complete — `UserRole` enum (3 values).
- **Admin:** Partial.
- **Testing:** Missing.
- **Missing Items:** `requireAdmin`; per-permission checks; role-management UI.
- **Priority:** High.
- **Completion:** **40%**

---

## 12. Observability & Communications

### 12.1 Logging
- **Description:** Structured request/error logging.
- **Frontend:** Missing.
- **Backend:** Missing — `console.error` only in a couple of places.
- **Database:** N/A.
- **Admin:** Missing.
- **Testing:** Missing.
- **Missing Items:** Structured logger (pino/winston); request IDs; log shipping.
- **Priority:** High.
- **Completion:** **5%**

### 12.2 Error Tracking
- **Description:** Sentry-style error capture.
- **Frontend:** Missing.
- **Backend:** Missing.
- **Database:** N/A.
- **Admin:** Missing.
- **Testing:** Missing.
- **Missing Items:** Entire feature.
- **Priority:** Medium.
- **Completion:** **0%**

### 12.3 Analytics
- **Description:** Product/usage analytics (GA, PostHog, Vercel).
- **Frontend:** Missing.
- **Backend:** Missing.
- **Database:** N/A.
- **Admin:** Missing.
- **Testing:** Missing.
- **Missing Items:** Entire feature.
- **Priority:** Low.
- **Completion:** **0%**

### 12.4 Transactional Email / Notifications
- **Description:** Welcome, order confirmation, status-update emails.
- **Frontend:** Missing.
- **Backend:** Missing — no email provider.
- **Database:** N/A.
- **Admin:** Missing.
- **Testing:** Missing.
- **Missing Items:** Entire feature.
- **Priority:** High.
- **Completion:** **0%**

---

## 13. Engineering Quality & DevOps

### 13.1 Type Checking
- **Description:** `tsc --noEmit` with strict mode.
- **Frontend:** Complete.
- **Backend:** Complete.
- **Database:** N/A.
- **Admin:** Complete.
- **Testing:** Complete (`npm run typecheck`).
- **Missing Items:** A few `as any` / `as unknown as` casts in admin routes.
- **Priority:** Low.
- **Completion:** **90%**

### 13.2 Linting / Formatting
- **Description:** ESLint + Prettier.
- **Frontend:** Missing.
- **Backend:** Missing.
- **Database:** N/A.
- **Admin:** Missing.
- **Testing:** Missing.
- **Missing Items:** No `.eslintrc`, no `.prettierrc`, no `lint` script. `AGENTS.md.txt` mandates "Keep TypeScript and ESLint clean".
- **Priority:** Medium.
- **Completion:** **0%**

### 13.3 Unit / Integration Tests
- **Description:** Automated test suite.
- **Frontend:** Missing.
- **Backend:** Missing.
- **Database:** Missing.
- **Admin:** Missing.
- **Testing:** Missing — zero tests, no framework installed.
- **Missing Items:** Entire feature.
- **Priority:** High.
- **Completion:** **0%**

### 13.4 End-to-End Tests
- **Description:** Playwright/Cypress flow tests (`AGENTS.md.txt` mandates Playwright).
- **Frontend:** Missing.
- **Backend:** Missing.
- **Database:** Missing.
- **Admin:** Missing.
- **Testing:** Missing.
- **Missing Items:** Entire feature.
- **Priority:** Medium.
- **Completion:** **0%**

### 13.5 CI / CD Pipeline
- **Description:** Automated build/test/deploy pipeline.
- **Frontend:** Missing.
- **Backend:** Missing.
- **Database:** Missing.
- **Admin:** Missing.
- **Testing:** Missing.
- **Missing Items:** No `.github/workflows`, no Vercel/Netlify config.
- **Priority:** Medium.
- **Completion:** **0%**

### 13.6 Database Migrations
- **Description:** Versioned, reviewable schema changes.
- **Frontend:** N/A.
- **Backend:** Complete.
- **Database:** Complete — 2 additive migrations, in sync with schema.
- **Admin:** N/A.
- **Testing:** Manual only.
- **Missing Items:** Migration tests; shadow-DB drift detection in CI.
- **Priority:** Low.
- **Completion:** **90%**

### 13.7 Build / Deployment
- **Description:** Production build + deployment story.
- **Frontend:** Partial — `next build` works; Tailwind CDN is a runtime concern.
- **Backend:** Partial — file uploads break on serverless/readonly FS.
- **Database:** N/A.
- **Admin:** Partial.
- **Testing:** Missing.
- **Missing Items:** Deployment docs; target platform decision; upload migration.
- **Priority:** High.
- **Completion:** **50%**

### 13.8 Documentation
- **Description:** Onboarding/architecture/API docs.
- **Frontend:** N/A.
- **Backend:** N/A.
- **Database:** N/A.
- **Admin:** N/A.
- **Testing:** N/A.
- **Missing Items:** `AGENTS.md.txt` diverges from reality; `README.md` does not exist; **`docs/` now contains this audit suite**.
- **Priority:** Low.
- **Completion:** **60%** (now that `docs/` exists)

---

## Cross-cutting inventory totals

| Status | Count |
|---|---:|
| Complete | 11 |
| Partial | 41 |
| Stub | 1 |
| Missing | 33 |
| Not Required / N/A | (varies per layer) |
| **Total features tracked** | **90** |

### By priority

| Priority | Count |
|---|---:|
| Critical | 11 |
| High | 22 |
| Medium | 28 |
| Low | 29 |

### Critical-priority features (the launch-blocker shortlist)

1. User Login rate limiting (1.2)
2. Rate Limiting / Brute-Force Protection (1.7)
3. Checkout server-authoritative totals (3.6)
4. Order Totals & Pricing integrity (3.7)
5. Order Placement stock race + shipping (4.1)
6. Online Payment Gateway (4.8)
7. Admin Product edit/delete UI (6.4)
8. Arabic / RTL Support (8.1)
9. Localization i18n (8.2)
10. Secret Management (11.3)
11. (Implicit) Logging (12.1) — currently 5%, blocks operational readiness

---

## Notes on interpretation

- A feature marked **Complete** here is functional for its *current* scope but
  may still need hardening, tests, or scaling work before launch. See the
  "Missing Items" line for each.
- **Partial** is the most common status — the feature exists and works in the
  happy path but has known gaps documented in `docs/Project_Audit.md`.
- Percentages are weighted: a feature with Complete FE/BE/DB but Missing
  Testing and clear Missing Items typically lands at 60–85%, not 100%.
- **Admin Status = Not Required** appears on customer-facing features where
  the admin panel has no role (e.g. cart badge sync).
- This matrix should be re-baselined after each phase of work; it is a
  living checklist, not a one-time report.
