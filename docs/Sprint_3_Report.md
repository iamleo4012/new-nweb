# Sprint 3 Report — Customer Experience & Order Entry Foundation

> **Project:** nassim-platform (AL-NASSIM)
> **Sprint:** 3 (Phase 3 — Customer Experience)
> **Date completed:** 2026-07-22
> **Plan reference:** `docs/MASTER_DEVELOPMENT_PLAN.md` §16 Sprint 3

## Summary

Sprint 3 is complete. The platform now supports a complete customer ordering
experience for both guest and registered users: guests can browse, search,
add to cart, and checkout without an account; registered users get
auto-populated forms, persistent cart merge, saved addresses, and wishlist.
The root cause of the `POST /api/orders` 400 bug was found and fixed
permanently (Zod email validation rejected empty strings from guests).
Auth UX was improved so guest users never see console errors — the auth
endpoint returns 200 with `{guest: true}` instead of 401.

## Completed tasks

| Part | Task | Status |
|---|---|---|
| **5** | Fix `POST /api/orders` 400 bug — Zod schema rejected empty-string email from guests. Root cause: `z.string().email()` rejects `""`. Fixed with `z.union([z.string().email(), z.literal(""), z.undefined()])` | ✅ |
| **6** | Auth UX — `GET /api/auth/me` now returns 200 `{user: null, guest: true}` for unauthenticated users instead of 401. Frontend treats this as Guest Mode, not a console error. | ✅ |
| **1+2+8** | Checkout page rebuilt with Kuwait address fields (Area, Block, Street, Building, Floor, Apartment, Landmark), logged-in auto-population, "Save Address" checkbox, double-submit prevention, loading state, error display, and success page with order tracking link | ✅ |
| **3** | Cart merge — `mergeGuestCart()` added to `account.js`; called after both login and signup. Merges localStorage cart items into the server cart via `POST /api/cart`. Clears guest cart after merge. Never loses products. | ✅ |
| **4** | Wishlist guest popup — guests clicking wishlist on the PDP see a modal ("Create an account to save products to your wishlist") with Sign In / Create Account / Continue Browsing buttons. Logged-in users get the normal wishlist toggle with server sync. | ✅ |
| **7** | Customer profile improved — added "Track Order" and "Wishlist" menu items; order list items now link to `order-detail.html`; status colours updated for new workflow statuses | ✅ |
| **9+10** | Order detail page already functional from Sprint 2; checkout validation now validates name/phone/area/block/street before submission; prevents double clicks with `submitting` flag | ✅ |

## Files modified

### Source code
| File | Change |
|---|---|
| `app/api/orders/route.ts` | Fixed Zod email validation to accept empty string / undefined (guest checkout). Root cause of 400 bug. |
| `app/api/auth/me/route.ts` | GET returns 200 `{user: null, guest: true}` for guests instead of 401 |
| `public/assets/js/checkout.js` | Complete rewrite: Kuwait address fields, logged-in auto-populate, address builder, double-submit prevention, loading state, error display, success page, save-address option |
| `public/assets/js/account.js` | Added `mergeGuestCart()` for guest→account cart merge; updated profile menu (Track Order, Wishlist); updated order status colours; guest session handling |
| `public/checkout.html` | Rebuilt form: Customer Information + Delivery Address (Kuwait fields) + Delivery Notes + Save Address + error banner + logged-in banner |
| `public/product view.html` | Wishlist toggle: guests get popup instead of saving; logged-in users get server-synced wishlist |

### New files
| File | Purpose |
|---|---|
| `app/api/addresses/route.ts` | GET (list addresses) + POST (create address) for authenticated users |
| `docs/Sprint_3_Report.md` | This report |

## Database changes

**No schema changes.** The `Address` model already existed from the Phase 2
migration. Sprint 3 created the API layer for it.

## APIs added/modified

| Endpoint | Method | Change |
|---|---|---|
| `/api/orders` | POST | **Fixed** — email field now accepts empty string (guest checkout) |
| `/api/auth/me` | GET | **Modified** — returns 200 `{guest: true}` for unauthenticated users |
| `/api/addresses` | GET | **New** — list saved addresses for authenticated user |
| `/api/addresses` | POST | **New** — create a saved address |

## UI improvements

- **Checkout page**: Professional 3-section layout (Customer Information, Delivery Address with Kuwait fields, Delivery Notes). Logged-in banner. Error display. Estimated total with POS disclaimer. Success page with order tracking link.
- **Wishlist**: Guest popup with Sign In / Create Account / Continue Browsing buttons.
- **Profile menu**: Added Track Order + Wishlist links; order cards link to order-detail page.
- **Order status colours**: Updated for all 11 new workflow statuses.
- **Auth UX**: No console errors for guests — Guest Mode is the default.

## Bugs fixed

| Bug | Root cause | Fix |
|---|---|---|
| `POST /api/orders` returning 400 for guests | Zod schema `z.string().email()` rejects empty string `""`. The checkout form sends `customerEmail: ""` for guests. | Changed to `z.union([z.string().email(), z.literal(""), z.undefined()])` — accepts valid email, empty string, or undefined |
| Console error on every page for guests | `GET /api/auth/me` returned 401; browser logs 4xx responses as errors | Changed to return 200 `{guest: true}` for unauthenticated users |
| Cart lost after login | No merge logic between localStorage guest cart and server cart | Added `mergeGuestCart()` that POSTs guest items to `/api/cart` then clears localStorage |

## Tests executed

| Test | Result |
|---|---|
| `npm run typecheck` | ✅ Exit 0 |
| `npm run build` | ✅ Exit 0, 32 routes compile |
| Guest checkout (no email) | ✅ HTTP 200, order created, status PENDING |
| Auth me (guest) | ✅ HTTP 200, `{user: null, guest: true}` |
| Auth me (logged in) | ✅ HTTP 200, `{user: {...}, guest: false}` |
| Checkout page | ✅ HTTP 200, has Kuwait address fields |
| Order detail page | ✅ HTTP 200 |
| Addresses API (guest) | ✅ HTTP 401 (correct — auth required) |
| Addresses API (auth) | ✅ Works |
| Notifications API (guest) | ✅ HTTP 401 |
| Cart merge | ✅ Login + POST /api/cart works |
| No index.html references | ✅ Zero references in home.html |

## Remaining Sprint 4 items

1. **Mobile hamburger menu** (C-09) — mega-menu doesn't collapse
2. **Tailwind via build** (H-S06) — still using Play CDN
3. **Wire dead href="#" links** (H-S01) — 33 homepage links
4. **Migrate siloed catalog pages** (H-S05) — inline arrays still drift
5. **Product edit/delete UI** (H-A01) — API supports it, no buttons
6. **Admin login screen** (H-A02)
7. **Pagination on admin lists** (H-A04)
8. **AuditLog viewer** (H-A07)

## Updated project completion percentage

| Layer | Sprint 2 | Sprint 3 | Change |
|---|---:|---:|---:|
| Database / schema | 90% | **90%** | — |
| Backend / API | 85% | **88%** | +3 pp (addresses API, email fix, auth UX) |
| Admin panel | 60% | **60%** | — (admin work is Sprint 4+) |
| Storefront | 50% | **60%** | +10 pp (checkout UX, cart merge, wishlist, auth) |
| Security & DevOps | 45% | **45%** | — |
| **Overall** | **65%** | **68%** | **+3 pp** |

## Estimated remaining timeline

| Scenario | Post-Sprint 2 | Post-Sprint 3 |
|---|---|---|
| 1 engineer, to launch (M4) | ~22 weeks | **~20 weeks** |
| 2 engineers, to launch (M4) | ~14 weeks | **~12 weeks** |
| 1 engineer, to hardened (M5) | ~28 weeks | **~26 weeks** |
| 2 engineers, to hardened (M5) | ~18 weeks | **~16 weeks** |
