# Changelog

All notable changes to this project are documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/),
versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
