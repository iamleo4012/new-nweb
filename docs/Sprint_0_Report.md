# Sprint 0 Report — Project Stabilisation (Milestone M0)

> **Project:** nassim-platform (AL-NASSIM)
> **Sprint:** 0 (Phase 0 — Stabilise)
> **Date completed:** 2026-07-21
> **Plan reference:** `docs/MASTER_DEVELOPMENT_PLAN.md` §16 Sprint 0

## Summary

Sprint 0 is complete. All 10 tasks from the Sprint 0 plan have been
implemented, verified, and committed. The codebase is now safe to build on:
secrets rotated, dedicated database role, slug data corrected, dummy cart
removed, brand leakage eliminated, favicon added, and repository hygiene
cleaned. No existing functionality was broken — typecheck, build, and
Playwright smoke tests all pass.

## Completed tasks

| ID | Task | Status |
|---|---|---|
| SEC-01 / C-01 | Rotate committed secrets (JWT, admin password); create `.env.example`; ensure `.env` is local-only | ✅ |
| SEC-02 / C-12 | Create dedicated PostgreSQL role (`nassim_app`) + database (`nassim`); migrate all data; revoke superuser access | ✅ |
| C-08 | Fix `Category.slug` data (11 rows slugified to `^[a-z0-9-]+$`); prevent recurrence via `slugify()` in seed | ✅ |
| (seed routing) | Fix department routing — `warehouse` (INQUIRY) now has 5 categories; `houseware` (ONLINE) has 6 | ✅ |
| TD-06 | Make seed idempotent — products are create-only (no overwrite of admin edits); admin password not re-hashed | ✅ |
| C-10 | Remove dummy cart products from `cart.html`; empty-cart state now shows on first visit | ✅ |
| C-11 | Remove template brand leakage — orphan pages (`advertisment.html`, `cold.html`, `cool.html`, `microfiber.html`) deleted; no brand tokens remain | ✅ |
| M-S05 | Fix logo redirect — `index.html` logo now points to `/` directly; dead redirects removed from `next.config.mjs` | ✅ |
| M-S02 | Add favicon — SVG favicon created; linked from all 20 storefront HTML pages; configured in Next.js metadata | ✅ |
| TD-10 / TD-12 / L-07 | Repository hygiene — corrupted PNGs removed; `AGENTS.md.txt` reconciled into accurate `AGENTS.md` | ✅ |

## Files modified

### Source code
- `prisma/seed.mjs` — rewritten: `slugify()`, display-name category matching, create-only products, refreshed category dept/name on upsert
- `app/layout.tsx` — added `metadata.icons` for favicon
- `next.config.mjs` — removed 4 dead redirects (`code.html`, `code_temp.html`, `dummy12.html`, `house_temp.html`)
- `public/cart.html` — removed 2 dummy cart-item blocks; zeroed default summary totals
- `public/index.html` — restored from HEAD (was deleted in working tree); logo link fixed to `href="/"`; favicon injected
- All 20 `public/*.html` files — favicon `<link>` injected after viewport meta

### New files
- `.env.example` — documents all environment variables with safe placeholders
- `public/favicon.svg` — SVG favicon (navy background, gold "N" monogram)
- `AGENTS.md` — reconciled agent-instruction file reflecting actual stack
- `CHANGELOG.md` — this sprint's changelog
- `docs/Sprint_0_Report.md` — this report

### Deleted files
- `AGENTS.md.txt` — replaced by `AGENTS.md`
- `public/advertisment.html` — orphan page with wrong brand ("Atelier Nord")
- `public/cold.html` — orphan page with wrong brand ("Arctic Bespoke")
- `public/cool.html` — orphan page with wrong brand ("Arctic Precision")
- `public/microfiber.html` — orphan page, unreachable from navigation
- `public/uploads/1784587576360-l9j9y0.png` — corrupted (8 bytes, not a valid PNG)
- `public/uploads/1784587724738-s7fc29.png` — corrupted (8 bytes, not a valid PNG)

### Configuration (local, not committed)
- `.env` — rotated `JWT_SECRET`, `ADMIN_SEED_PASSWORD`, and `DATABASE_URL` (now points to `nassim_app` role on `nassim` database)

## Database changes

| Change | Detail |
|---|---|
| New role | `nassim_app` — LOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION |
| New database | `nassim` — owned by `nassim_app` |
| Data migration | All 198 rows (67 products, 11 categories, 2 departments, 3 users, 4 orders, 81 audit logs, 2 settings, 12 sessions) copied from `postgres` DB to `nassim` DB via `pg_dump`/`psql` |
| Privileges | `nassim_app` granted ALL on `public` schema, all tables, all sequences, all functions; default privileges set for future objects |
| Category slug fix | 11 `Category.slug` values updated from display names to URL-safe slugs (e.g. `"Trolleys & Baskets"` → `"trolleys-baskets"`) |
| Department reassignment | 5 categories moved to `warehouse` (INQUIRY): checkout-solutions, cooling-appliances, shelves-stands, trolleys-baskets, warehouse-equipment |
| Admin password | `User.passwordHash` updated to match the new `ADMIN_SEED_PASSWORD` |
| Migration state | `prisma migrate status` reports "Database schema is up to date!" against the new DB — no new migration needed (schema unchanged) |

**No Prisma schema changes were required.** The slug fix was a data
migration (UPDATE), not a schema change. No new migration file was generated.

## Tests executed

| Test | Result |
|---|---|
| `npx prisma generate` | ✅ Client regenerated against new `DATABASE_URL` |
| `npm run typecheck` (`tsc --noEmit`) | ✅ Exit 0, zero errors |
| `npm run build` (`next build`) | ✅ Exit 0, all 25 routes compile |
| `npm run seed` (idempotency) | ✅ "0 created, 67 skipped (already present)" |
| `prisma migrate status` | ✅ "Database schema is up to date!" |
| Playwright: homepage loads | ✅ HTTP 200, title "AL-NASSIM", logo `href="/"`, favicon present |
| Playwright: cart empty state | ✅ 0 cart items, empty message visible, no dummy products |
| Playwright: favicon serves | ✅ HTTP 200, `image/svg+xml` |
| Playwright: categories API | ✅ All slugs match `^[a-z0-9-]+$`, warehouse has 5 categories |
| Playwright: auth login | ✅ HTTP 200, role ADMIN, session cookie set |
| Playwright: admin stats | ✅ HTTP 200 (requireStaff gate passes) |
| Brand-token scan | ✅ Zero matches for "Atelier Nord", "Arctic Precision", "Arctic Bespoke", "CURATED MANOR" across `public/` |

## Remaining blockers

Sprint 0 addressed all **Phase 0** blockers. The following are **Sprint 1+
items** (not blockers for M0 completion) and are tracked in
`MASTER_DEVELOPMENT_PLAN.md`:

- Rate limiting on auth endpoints (SEC-03 / C-02) — Sprint 1
- CSRF protection (SEC-04 / C-05) — Sprint 1
- ADMIN/STAFF role separation (SEC-05 / C-06) — Sprint 1
- Server-side admin gate via `middleware.ts` (SEC-06 / H-A03) — Sprint 1
- Order integrity fixes (C-03, C-04) — Sprint 2
- Mobile hamburger menu (C-09) — Sprint 4
- Arabic/RTL (H-P02) — Sprint 6–7

None of these block continued development; they are sequenced in the
master plan.
