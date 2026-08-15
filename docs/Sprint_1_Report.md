# Sprint 1 Report — Security Foundation (Phase 1)

> **Project:** nassim-platform (AL-NASSIM)
> **Sprint:** 1 (Phase 1 — Security hardening)
> **Date completed:** 2026-07-21
> **Plan reference:** `docs/MASTER_DEVELOPMENT_PLAN.md` §16 Sprint 1

## Summary

Sprint 1 is complete. All Phase 1 security tasks are implemented and
verified, and the `index.html` legacy page has been fully retired in favour
of `home.html` as the single application homepage. The platform now has:
edge-middleware authentication gating, role-based access control with
separate STAFF and ADMIN permissions, rate limiting on auth endpoints,
hardened session cookies, defence-in-depth security headers, centralised
password hashing (bcrypt cost 12), email-change password re-verification,
and startup environment-variable validation.

## Completed tasks

### index.html retirement (project directive)
| Task | Status |
|---|---|
| Migrate every `index.html` reference to `home.html` (19 storefront HTML files + 10 JS `currentPath` defaults + `account.js`) | ✅ |
| Update `next.config.mjs`: `/` rewrites to `/home.html`; `/index.html` 308-redirects to `/home.html` | ✅ |
| Update `AdminApp.tsx`: both `/index.html` links → `/home.html` | ✅ |
| Delete `public/index.html` | ✅ |
| Verify zero `index.html` references remain in `public/`, `app/`, `lib/` | ✅ |

### Security hardening (Sprint 1 plan items)
| ID | Task | Status |
|---|---|---|
| SEC-03 / C-02 | Rate limiting on `/api/auth/login` + `/api/auth/register` (10 req/min/IP/endpoint) | ✅ |
| SEC-04 / C-05 | CSRF infrastructure: HMAC-based CSRF token + `sameSite: "strict"` cookies | ✅ |
| SEC-05 / C-06 | `requireAdmin()` gate; STAFF denied on destructive operations | ✅ |
| SEC-06 / H-A03 | Edge middleware (`middleware.ts`) gates `/admin` server-side | ✅ |
| SEC-10 / H-M02 | Centralised bcrypt helper (cost 12) replacing 3 duplicated cost-10 sites | ✅ |
| SEC-12 | Password re-verification required to change email address | ✅ |
| DEP-05 | `middleware.ts` foundation created | ✅ |
| (L-10 / SEC-11) | Security headers: `Permissions-Policy`, `X-XSS-Protection`, `X-DNS-Prefetch-Control` added to existing set | ✅ |
| (env validation) | `lib/env.ts` validates required env vars at startup | ✅ |

## Files modified

### New files
- `middleware.ts` — edge middleware: admin route gate, rate limiting, security headers
- `lib/security.ts` — rate limiter, CSRF token helpers, centralised password hashing (bcrypt cost 12), constant-time comparison, client-IP extraction
- `lib/env.ts` — startup environment-variable validation (throws on missing/malformed)
- `docs/Sprint_1_Report.md` — this report

### Modified files
- `lib/auth.ts` — added `requireAdmin()`, `getSessionToken()`, `SECRET` export; embedded `role` in JWT; hardened cookie `sameSite: "lax"` → `"strict"`; `createSession` now takes a `role` argument
- `lib/db.ts` — imports `lib/env` for startup validation
- `app/api/auth/login/route.ts` — uses centralised `verifyPassword`; passes role to `createSession`
- `app/api/auth/register/route.ts` — uses centralised `hashPassword`; passes role to `createSession`
- `app/api/auth/me/route.ts` — requires `currentPassword` for email changes; uses centralised `hashPassword`/`verifyPassword`; re-issues session after password change
- `app/api/admin/customers/[id]/route.ts` — PATCH now uses `requireAdmin`
- `app/api/admin/products/route.ts` — DELETE now uses `requireAdmin`
- `app/api/admin/hierarchy/[entity]/route.ts` — DELETE now uses `requireAdmin`
- `app/api/admin/master/[entity]/route.ts` — DELETE now uses `requireAdmin`
- `app/admin/AdminApp.tsx` — `/index.html` → `/home.html` (2 refs)
- `next.config.mjs` — `/` → `/home.html`; `/index.html` redirect to `/home.html`; added `Permissions-Policy`, `X-XSS-Protection`, `X-DNS-Prefetch-Control` headers
- `prisma/seed.mjs` — bcrypt cost 10 → 12 (matches centralised helper)
- All 19 storefront HTML files — `index.html` → `home.html` logo/footer links
- 10 category HTML files — JS `currentPath` default `"index.html"` → `"home.html"`
- `public/assets/js/account.js` — `index.html` → `home.html`

### Deleted files
- `public/index.html` — retired legacy homepage

## Security improvements

| Area | Before | After |
|---|---|---|
| Admin page gate | Client-side only (`fetch /api/auth/me`) | **Server-side** edge middleware redirects unauthenticated users |
| Role separation | STAFF ≡ ADMIN (identical powers) | **STAFF** = reads + routine ops; **ADMIN** = destructive ops (product delete, hierarchy delete, master delete, customer deactivate) |
| Rate limiting | None | **10 req/min/IP** on login + register; returns 429 with `Retry-After` |
| CSRF defence | `sameSite: "lax"` only | `sameSite: "strict"` + HMAC-based CSRF token infrastructure in `lib/security.ts` |
| Password hashing | bcrypt cost 10, duplicated in 3 files | **bcrypt cost 12**, centralised in `lib/security.ts` |
| Email changes | Allowed without re-verification | **Requires current password**; 400/403 on missing/incorrect |
| Session after password change | Old sessions remained valid | **All sessions invalidated**; fresh session issued |
| JWT payload | `{uid, sid}` only | `{uid, sid, role}` — enables edge middleware authorisation |
| Security headers | 3 headers | **6 headers** (added Permissions-Policy, X-XSS-Protection, X-DNS-Prefetch-Control) |
| Environment validation | None (fails silently at runtime) | **Validates at startup** — throws on missing/malformed vars |

## Database changes

**No schema changes.** No new migration. The `role` claim was added to the
JWT payload (application-level, not DB). All existing sessions remain valid
(the role claim is only checked by middleware as a hint; route handlers
re-read the role from the DB via `getSessionUser`).

## Testing performed

| Test | Result |
|---|---|
| `npm run typecheck` | ✅ Exit 0, zero errors |
| `npm run build` | ✅ Exit 0, all 25 routes + middleware (51.9 kB) compile |
| `/` serves `home.html` | ✅ HTTP 200, 59 KB, title "AL-NASSIM" |
| `/index.html` redirects to `/home.html` | ✅ HTTP 308 |
| Zero `index.html` refs in served HTML | ✅ `hasIndexRef: false` |
| Security headers present | ✅ All 6 headers verified |
| Admin gate (guest) | ✅ Edge redirect fires (opaqueredirect) |
| Admin API gate (guest, no cookies) | ✅ HTTP 403 |
| Admin gate (authenticated) | ✅ Passes through |
| Login | ✅ HTTP 200, role ADMIN |
| Rate limiting | ✅ 9×401 then 429 on 10th attempt |
| STAFF reads products (requireStaff) | ✅ HTTP 200 |
| STAFF DELETE product (requireAdmin) | ✅ HTTP 403 |
| STAFF DELETE hierarchy (requireAdmin) | ✅ HTTP 403 |
| STAFF deactivate customer (requireAdmin) | ✅ HTTP 403 |
| ADMIN DELETE product (requireAdmin) | ✅ HTTP 404 (passes gate; product 999 doesn't exist) |
| ADMIN reads stats (requireStaff) | ✅ HTTP 200 |
| Email change without password | ✅ HTTP 400 "Current password is required" |
| Email change wrong password | ✅ HTTP 403 "Current password is incorrect" |
| Email change correct password | ✅ HTTP 200, email updated |

## Verification results

All Sprint 1 checklist items pass:
- ✅ Every Sprint 1 task finished
- ✅ `npm run typecheck` passes
- ✅ `npm run build` succeeds
- ✅ Playwright security tests pass
- ✅ No console errors introduced (only the expected `/api/auth/me` 401 for guests)
- ✅ No security regression — all existing functionality preserved
- ✅ `index.html` completely retired; `home.html` is the only homepage

## Remaining blockers

None for Sprint 1. The following are **Sprint 2+ items** (tracked in the
master plan):

- Order integrity: server-authoritative shipping + transactional stock (C-03/C-04) — Sprint 2
- Order state machine (H-A05) — Sprint 2
- Image storage reconciliation (H-S04) — Sprint 2
- CSRF token issuance endpoint + frontend integration (the infrastructure
  is in `lib/security.ts` but no route currently issues tokens to the
  storefront; the `sameSite: strict` cookie provides primary CSRF defence
  in the meantime) — Sprint 2 or later
- Admin login screen (H-A02) — Sprint 3
- Mobile hamburger menu (C-09) — Sprint 4

## Recommendations for Sprint 2

1. **Order integrity first** — this is the highest-risk remaining gap
   (client-supplied shipping, stock race). Implement C-03 and C-04 together
   since they touch the same `orders/route.ts` code path.
2. **Add a CSRF token endpoint** (`GET /api/auth/csrf`) that returns
   `issueCsrfToken(getSessionToken())` so the storefront can send the
   `x-csrf-token` header on mutations. The infrastructure is ready; only
   the endpoint + frontend wiring is needed.
3. **Write regression tests** for the role-separation logic — a unit test
   that asserts STAFF gets 403 and ADMIN gets 200 on each `requireAdmin`
   endpoint. This prevents accidental role-broadening in future refactors.
4. **Consider session rotation on role change** — if an admin is ever
   demoted to STAFF, their existing JWT still carries `role: "ADMIN"` until
   it expires. The DB lookup in `getSessionUser` catches this (returns the
   fresh role), but the middleware hint could be stale for up to 30 days.
   A `requireAdmin`-protected endpoint that re-issues the session on role
   change would close this gap.
