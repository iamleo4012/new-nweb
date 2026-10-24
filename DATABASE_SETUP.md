# Database Setup

The active database for this application is **Neon PostgreSQL** (as of 2026-10-24).
The previous local PostgreSQL database (`nassim` on `localhost:5432`) was migrated
in full to Neon and remains intact locally, but the application no longer reads
its connection details from any local configuration.

## Active configuration

- Neon org: `org-crimson-boat-65486433` (leo)
- Neon project: `wandering-dew-69914706` — "al-nassim website" (PostgreSQL 18, aws-us-east-2)
- Branch: `production`
- Database: `neondb` · Role: `neondb_owner`
- ORM: Prisma 6 — connection is created in `lib/db.ts` from `DATABASE_URL`; no other
  database access point exists in the app (verified: no hardcoded local DB references).

## Required environment variables

| Variable | Purpose | Where |
|---|---|---|
| `DATABASE_URL` | Runtime connection. Use the Neon **pooled** string (`...-pooler...`) with `sslmode=require`. | `.env` locally; Vercel project env vars in production |
| `DIRECT_URL` | Used by Prisma for migrations (`directUrl` in `prisma/schema.prisma`). Use the Neon **direct/unpooled** string. | `.env` locally; Vercel env vars when running migrations |
| `JWT_SECRET`, `SESSION_COOKIE_NAME`, `ADMIN_SEED_EMAIL`, `SUPERADMIN_SEED_EMAIL`, `RESEND_API_KEY`, `APP_URL`, `EMAIL_FROM`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, staff seed vars | Unchanged from before; all server-side only | `.env` / Vercel |

All connection strings must be kept in server-side environment variables — never
hardcoded and never exposed to client code (`.env` is git-ignored).

## Migrations

- `npx prisma migrate deploy` — safe for production; run against `DIRECT_URL`.
- Never run `prisma migrate reset` or `db push` against production.
- A pre-existing failed-migration record for `20261013120000_add_product_name_ar`
  (copied from local) has been marked as rolled back on Neon via
  `prisma migrate resolve`; `migrate status` reports "Database schema is up to date!".

## Vercel readiness (do not deploy yet)

1. Set all env vars above in the Vercel project settings (Production + Preview).
   `.env.local`/`.env` will NOT be uploaded — they must be configured in Vercel.
2. Runtime should use the **pooled** connection string (`-pooler` endpoint) — serverless
   functions open many short-lived connections and the pooler prevents connection
   exhaustion. Migrations use `DIRECT_URL` (direct endpoint).
3. `sslmode=require` is mandatory on both strings.
4. Prisma on Vercel requires the Prisma client engines; `postinstall: prisma generate`
   (or build hook) — already handled by the current build.
5. Neon compute auto-suspends when idle; the first request after suspension has extra
   cold-start latency. This is expected.

## Backup

A complete pre-migration snapshot of the local database is at
`db-backups/nassim_pre_neon_migration_20261024_083040.dump`
(PostgreSQL custom format; `*.dump` is git-ignored). The local database itself was
not modified during migration.
