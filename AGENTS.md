# AGENTS.md

> Agent instructions for the Nassim 2.0 e-commerce platform.
> This file reflects the **actual** project state as of Sprint 0 (Milestone M0).
> See `docs/` for the full audit and the `MASTER_DEVELOPMENT_PLAN.md` roadmap.

## Project

Nassim 2.0 E-commerce Platform (brand: AL-NASSIM / Al Nassim Golden Group).
A Kuwaiti B2B/B2C e-commerce platform for houseware + warehouse equipment.

## Tech Stack (actual)

- **Next.js 15** (App Router) — hosts the REST API and admin SPA only
- **React 19** — used by the admin panel (`app/admin/`)
- **TypeScript** (strict) — `^5.7.0`
- **Tailwind CSS** — currently loaded via Play CDN on both storefront and admin
  (Sprint 0 does not change this; migration to build-time Tailwind is planned
  in a later sprint per `MASTER_DEVELOPMENT_PLAN.md` task H-S06)
- **PostgreSQL** — dedicated `nassim` database, least-privilege `nassim_app` role
- **Prisma ORM 6** — schema, migrations, client singleton in `lib/db.ts`
- **bcryptjs** — password hashing (cost 10)
- **jsonwebtoken** — session JWT signing/verification
- **zod** — request input validation on every mutation endpoint

> Note: Supabase Storage is **not** wired up. File uploads currently write to
> the local filesystem under `public/uploads/`. Cloud storage migration is
> planned (roadmap task C-07).

## Storefront

The user-facing storefront is **hand-written static HTML** in `public/`,
decorated at runtime by shared vanilla-JS bundles in `public/assets/js/`.
It is **not** a React app. The homepage `/` is rewritten to `/index.html`
(see `next.config.mjs`).

## Development Rules

- Never delete existing functionality unless explicitly instructed.
- Always preserve responsive layouts.
- Currency is **KWD** (Kuwaiti Dinar), 3 decimal places.
- Use reusable components; avoid duplicate code.
- Never use `any` unless unavoidable.
- Keep TypeScript strict-clean (`npm run typecheck` must pass).
- Update Prisma schema and migrations together (`prisma migrate dev`).
- Validate API routes before modifying them (Zod schemas are inline per route).
- Use server components where appropriate.
- Keep authentication secure (`lib/auth.ts`).
- Preserve existing database data — never destructive without confirmation.
- Arabic / RTL is a **goal**, not yet implemented (roadmap task H-P02).

## Project Structure (actual)

```
app/            Next.js App Router — API routes + admin SPA only
  /api/         REST route handlers
  /admin/       Admin React SPA (client components)
lib/            Shared server helpers (auth.ts, db.ts)
prisma/         schema.prisma, migrations/, seed.mjs
public/         Static HTML storefront + assets/js + uploads
docs/           Audit suite + master development plan
scripts/        (empty, reserved)
```

> The directories `components/`, `hooks/`, `services/`, `types/` do **not**
> exist. Admin components live under `app/admin/_components/`.

## Testing

Current state: **no automated test suite**. Testing infrastructure is
planned in roadmap Phase 8 (tasks M-E01 through M-E04).

Before completing a task:

- Run `npm run typecheck` — must pass with zero errors.
- Run the dev server (`npm run dev`) and verify affected flows.
- Use Playwright to verify affected user flows where UI is involved.
- Check the browser console for errors.
- Verify mobile responsiveness.

## Database

- PostgreSQL 18, dedicated `nassim` database, `nassim_app` role (non-superuser).
- Prisma ORM. Schema in `prisma/schema.prisma` (20 models, 4 enums).
- Never perform destructive schema changes without confirmation.
- Migrations are additive and forward-only.

## Git

- Make focused commits with conventional commit messages.
- Do not rewrite history.
- Prefer small logical changes.
- Secrets live in `.env` (git-ignored); `.env.example` documents the vars.

## Goal

Maintain production-quality code suitable for deployment.
