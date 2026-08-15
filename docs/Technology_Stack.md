# Technology Stack

> Project: **nassim-platform**
> Audit date: 2026-07-21

This document records the actual technology stack used by the codebase, with
versions pinned from `package.json` and `package-lock.json`, plus the
discrepancies versus the intended stack described in `AGENTS.md.txt`.

---

## 1. Runtime stack (declared vs. actual)

| Layer | Intended (`AGENTS.md.txt`) | Actual (`package.json`) |
|---|---|---|
| Web framework | Next.js 15 | ✅ Next.js `^15.1.6` |
| UI runtime | React | ✅ React `^19.0.0` (+ react-dom `^19.0.0`) |
| Language | TypeScript (strict) | ✅ TypeScript `^5.7.0`, `strict: true` |
| Styling | Tailwind CSS | ⚠️ Tailwind via **Play CDN** (`cdn.tailwindcss.com`) — not installed as a dependency |
| Database | PostgreSQL | ✅ PostgreSQL (via `DATABASE_URL`) |
| ORM | Prisma | ✅ Prisma `^6.3.0`, `@prisma/client ^6.3.0` |
| Object storage | Supabase Storage | ❌ **Not used** — file uploads write to local `public/uploads/` |
| Auth | (unspecified) | bcryptjs + jsonwebtoken + opaque sessions |
| Validation | (unspecified) | Zod `^3.24.1` |
| Arabic/RTL | "Maintain Arabic RTL compatibility" | ❌ **Not implemented** — no RTL, no AR strings |

---

## 2. Exact versions (`package.json`)

### Dependencies
| Package | Version | Purpose |
|---|---|---|
| `next` | `^15.1.6` | App Router framework (API routes + admin) |
| `react` | `^19.0.0` | Admin UI runtime |
| `react-dom` | `^19.0.0` | Admin DOM rendering |
| `@prisma/client` | `^6.3.0` | Type-safe Postgres ORM |
| `prisma` (devDep) | `^6.3.0` | CLI / migrate / generate |
| `bcryptjs` | `^2.4.3` | Password hashing (pure JS) |
| `jsonwebtoken` | `^9.0.2` | JWT signing/verification for session cookies |
| `zod` | `^3.24.1` | Runtime input validation |

### Dev dependencies
| Package | Version |
|---|---|
| `typescript` | `^5.7.0` |
| `@types/node` | `^22.10.0` |
| `@types/react` | `^19.0.0` |
| `@types/react-dom` | `^19.0.0` |
| `@types/bcryptjs` | `^2.4.6` |
| `@types/jsonwebtoken` | `^9.0.7` |

> The dependency footprint is intentionally minimal — **no UI component library,
> no state-management library, no SWR/React Query, no testing framework,
> no ESLint config, no PostCSS/Tailwind tooling**.

---

## 3. npm scripts

| Script | Command |
|---|---|
| `dev` | `next dev -p 3000` |
| `build` | `next build` |
| `start` | `next start -p 3000` |
| `prisma:generate` | `prisma generate` |
| `prisma:migrate` | `prisma migrate dev` |
| `prisma:deploy` | `prisma migrate deploy` |
| `seed` | `node prisma/seed.mjs` |
| `typecheck` | `tsc --noEmit` |

Prisma seed is also wired through the `prisma.seed` config (`node prisma/seed.mjs`).

> ⚠️ There is **no `lint` script** and **no `test` script**. There are **zero
> automated tests** in the project.

---

## 4. TypeScript configuration

From `tsconfig.json`:

- `target`: `ES2022`
- `module` / `moduleResolution`: `esnext` / `bundler`
- `strict`: **`true`** (strict mode is enforced)
- `allowJs`: `true` (permits hand-written `.mjs` seed and the catalog JS to be type-checked in scope — though `public/` is excluded)
- `jsx`: `preserve` (Next handles transform)
- `incremental`: `true` (produces `tsconfig.tsbuildinfo`)
- Path alias: `@/* → ./*`
- `exclude`: `["node_modules", "rackingpage", "public", "code backup"]`

---

## 5. Next.js configuration (`next.config.mjs`)

| Feature | Implementation |
|---|---|
| `rewrites` | `{ source: "/", destination: "/index.html" }` — homepage serves static HTML |
| `redirects` | `/home.html`, `/house_temp.html`, `/dummy12.html`, `/code.html`, `/code_temp.html` → `/index.html` (or `/houseware.html`) |
| `headers` | `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin` on all routes |
| `images` | ❌ Next.js Image optimization not configured |
| `experimental` | none |

> Security headers are present at the Next.js layer, but there is **no CSP, no
> HSTS, no Permissions-Policy**. Note `X-Frame-Options: SAMEORIGIN` is
> deprecated in favour of `frame-ancestors` in CSP, but is harmless.

---

## 6. Styling approach

- **Admin panel** (`app/admin/**`): Tailwind utility classes loaded from
  **`https://cdn.tailwindcss.com`** via a `<Script strategy="beforeInteractive">`
  in `app/admin/layout.tsx`. This is the Tailwind *Play CDN* — a JIT compiler
  that runs in the browser. Tailwind explicitly warns against using it in
  production (ships the entire runtime, flashes unstyled content, no purge).
- **Storefront** (`public/**/*.html`): same Tailwind Play CDN
  (`https://cdn.tailwindcss.com?plugins=forms,container-queries`) is hotlinked
  on every HTML page, with the Tailwind config duplicated inline in a
  `<script id="tailwind-config">` block (≈60 color tokens repeated per page).
  A shared copy at `public/assets/js/tailwind-config.js` exists but is only
  used by `checkout.html`.
- One small hand-written stylesheet: `public/assets/css/dark-overrides.css`
  (dark-mode overrides, paired with `dark-overrides.js`).

> ⚠️ There is **no `tailwind.config.js`, no `postcss.config.js`,
> no `@tailwind` directives** — Tailwind is *not* part of the build. Both
> the admin and the storefront pull it from a public CDN at request time.

---

## 7. Data layer

- **Database:** PostgreSQL (connection string in `DATABASE_URL`).
- **ORM:** Prisma 6 with the `prisma-client-js` generator. The client is
  instantiated once in `lib/db.ts` via the standard `globalThis` singleton
  pattern (avoids connection exhaustion during Next.js hot reload).
- No `$extends`, no custom middleware, no Prisma logging config.
- **No raw SQL anywhere** in the codebase (zero `$queryRaw` / `$executeRaw`
  calls) — all access is parameterized via Prisma. No SQL-injection surface.

---

## 8. Authentication stack

- **Password hashing:** `bcryptjs` with cost factor **10** (duplicated in
  `app/api/auth/register/route.ts`, `app/api/auth/login/route.ts`,
  `prisma/seed.mjs` — no central helper).
- **Session tokens:** `jsonwebtoken` (HS256) signed with `JWT_SECRET`.
- **Session storage:** Database table `Session` is the source of truth; the
  JWT in the cookie is a wrapper. `getSessionUser()` verifies the JWT, looks
  up the Session row, checks `expiresAt`, and checks `user.isActive`.
- **Cookie:** `nassim_sid` (overridable via `SESSION_COOKIE_NAME`),
  `httpOnly`, `sameSite=lax`, `secure` in production, 30-day max age.
- **Authorization gate:** `requireStaff()` — admits `ADMIN` **or** `STAFF`
  (no `requireAdmin` exists; the two roles are treated identically).

---

## 9. File / media storage

- **Admin upload** (`app/api/admin/upload/route.ts`) writes to the local
  filesystem at `public/uploads/<timestamp>-<rand>.<ext>`, max 8 MiB,
  MIME allowlist `{jpeg,png,webp,gif,avif}`. Files are served as static
  assets under `/uploads/`.
- **No cloud storage** (Supabase, S3, Cloudinary) is wired up, despite
  `AGENTS.md.txt` claiming "Supabase Storage".
- Files are written to `public/` inside the deployment — **this breaks on
  read-only/serverless hosts** (Vercel, AWS Lambda) and would be lost on
  redeploy.

---

## 10. Frontend data fetching

- **Storefront:** vanilla `fetch()` calls in `public/assets/js/*.js`
  (no framework). Reads from `/api/catalog` (a `application/javascript`
  endpoint that injects `window.NASSIM_PRODUCTS`), `/api/products`,
  `/api/auth/me`, `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`,
  `/api/orders`, `/api/wishlist`.
- **Admin:** plain `useEffect + fetch + useState` in every tab component.
  No SWR, React Query, Redux, Zustand, or React Context.
- The server cart API (`/api/cart`) exists but the storefront **does not
  call it** — guests use localStorage. The admin does not surface cart data.

---

## 11. Missing / unused technologies

The following common pieces of a Next.js stack are **absent**:

- ❌ ESLint / Prettier config (no `.eslintrc`, no `.prettierrc`)
- ❌ Test framework (no Jest, Vitest, Playwright config in the main app)
- ❌ Storybook
- ❌ i18n library (next-intl, react-i18next, etc.)
- ❌ Email provider (no transactional email)
- ❌ Analytics (no Vercel Analytics, GA, PostHog)
- ❌ Payment provider (no Stripe, KNET, Tap, Checkout.com) — Cash on Delivery only
- ❌ Image optimization (`next/image` not used)
- ❌ Edge middleware (`middleware.ts` does not exist)
- ❌ Rate limiting / CSRF library

---

## 12. Detached stack: `rackingpage/`

A self-contained **Vite + React + TypeScript** prototype exists at
`rackingpage/` with its own:

- `package.json`, `package-lock.json`
- `vite.config.ts`
- `tsconfig.json`
- `src/App.tsx`, `src/main.tsx`, `src/index.css`
- Components: `ConfigSelector`, `FeatureCards`, `IsometricRacking`,
  `NavHeader`, `ProjectShowcase`, `SpecBadges`, `SpecTicker`, `TrustStrip`
- `src/utils/cn.ts` (className helper)

This is **not integrated** with the Next.js app and is excluded from the main
`tsconfig.json`. It appears to be a UI exploration for a racking-configurator
page that has not been wired into the platform.
