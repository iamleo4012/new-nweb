# Security Notes — Nassim 2.0

Living record of security-relevant decisions made during the 2026-08 hardening
pass. Read this before changing authentication, cookies, headers, or the order
endpoints.

## 1. CSRF posture

**Decision:** The primary CSRF mitigation is the session cookie's
`SameSite=Strict` flag (`lib/auth.ts`). A second, independent layer — an
`Origin` (or `Referer`) host check on every state-changing `/api/*` request —
lives in `middleware.ts` §2b. Requests without an `Origin` header pass; they
cannot carry the HttpOnly session cookie in a realistic cross-site attack that
SameSite does not already block.

**The unwired HMAC token infra in `lib/security.ts`
(`issueCsrfToken`/`verifyCsrfToken`):** implemented, tested, and deliberately
NOT wired into routes. Wiring it would require touching every state-changing
fetch in the storefront JS and both admin SPAs for marginal gain over the two
layers above. It remains available if the cookie policy ever must be relaxed
(e.g. `SameSite=Lax` for third-party embeds) — at that point wire it in
before shipping.

## 2. Guest order access (capability token)

`GET /api/orders/[id]` and `POST /api/orders/[id]/confirm` no longer serve
unauthenticated callers without proof. Guests must present the order's
capability token (`?token=…`) issued once in the checkout response:

- raw token: 192-bit `randomBytes(24)` base64url (`lib/order-access.ts`);
- only the SHA-256 hash is stored (`OrderSecurity.tokenHash`);
- the token both identifies and authorises the order (guest path);
- sequential order ids/numbers alone return 401/404 — mass PII enumeration is
  impossible;
- authenticated customers (userId match), ADMIN/STAFF/SUPERADMIN need no token;
- `OrderSecurity.idempotencyKey` carries the checkout idempotency key
  (`x-idempotency-key` header, one key per submission, see `checkout.js`);
  replays return the original order and never reserve stock twice.

`OrderSecurity` is a standalone table keyed by `orderNumber` (no FK) because
the legacy `Order` table is owned by the `postgres` migration role and the
least-privilege `nassim_app` role may not create constraints against it.

## 3. Financial values are server-derived

`shipping` is no longer accepted from the client. `lib/shipping.ts` derives
the flat fee (default 2.500 KWD, overridable via `Setting` key `shipping_fee`).
Item prices were always recomputed from the DB at order time. There is no
payment field anywhere (COD-only by construction).

## 4. Content-Security-Policy

CSP is issued in `next.config.mjs` and built from an inventory of the actual
resources in use (Google Fonts, `lh3.googleusercontent.com` product images).
Documented limitations of the current architecture:

- `script-src 'unsafe-inline'` — the 36 static storefront pages use inline
  scripts;
- `https://cdn.tailwindcss.com` — **REMOVED (2026-08-30).** The Tailwind
  **Play CDN** (a remote JIT compiler) used to run on every page — the single
  biggest obstacle to a strict CSP and a supply-chain risk on the checkout
  path. The staged migration to the local Tailwind build is complete: every
  storefront page loads `/assets/css/tailwind.css` and the admin/superadmin
  SPAs load `/assets/css/tailwind.admin.css` (default theme); script-src now
  allows no remote host. HSTS is emitted only in production builds.
- `script-src 'unsafe-eval'` is granted **in development only**: Next.js dev
  tooling (HMR/React Refresh module evaluation) requires eval — without it
  every App Router page fails to hydrate (forms submit natively, admin/
  superadmin SPAs never render). Production builds contain no eval and keep
  the stricter directive.

**Operational note:** the middleware page gate must only use Web-Crypto APIs
(`crypto.subtle`) — it runs on the edge runtime, where `jsonwebtoken`'s
`jwt.verify` cannot execute and fails closed for everyone
(`middleware.ts` verifyJwtEdge). Route handlers (Node runtime) keep using
jsonwebtoken.

## 5. Password reset

- Reset tokens: 32-byte crypto-random, stored as SHA-256, single-use,
  30-minute expiry, all sessions invalidated on use.
- Tokens/links are NEVER logged (`lib/email.ts`); the request route returns an
  identical response whether or not the account exists (anti-enumeration) and
  burns a bcrypt hash on the miss path to equalise timing.

## 6. Secrets incident (2026-08-18)

`.claude/settings.local.json` (Claude Code local settings) was found
**committed to git** containing plaintext PostgreSQL superuser passwords and a
historical admin password. Remediation state:

- the file was untracked (`git rm --cached`) and `.claude/`, `.playwright-mcp/`
  added to `.gitignore`;
- the secrets remain in git HISTORY and the GitHub remote — **rotation of the
  PostgreSQL superuser password(s) and any credential that appeared in that
  file is REQUIRED** (this cannot be done from the repository);
- history rewrite (filter-repo + force-push) is recommended but was not
  performed automatically because the repository has an active remote and
  multiple collaborators — coordinate before rewriting.

## 7. Uploads

`/api/admin/upload` validates: staff session → declared MIME (empty rejected)
→ 8 MB on real byte length → **magic-byte sniffing** (JPEG/PNG/GIF/WebP/AVIF)
→ stored extension derived from the sniffed type (never the client filename) →
random server-generated filename. `/uploads` responses carry
`X-Content-Type-Options: nosniff` via the global `next.config.mjs` header rule
(which covers paths the middleware matcher skips).
