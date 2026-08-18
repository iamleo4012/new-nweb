import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

/**
 * Edge middleware — runs before every matched request.
 *
 * Responsibilities:
 *   1. Server-side gate for /admin pages (the client-side gate in AdminApp
 *      is cosmetic; this is the authoritative check).
 *   2. Rate limiting on /api/auth/login and /api/auth/register to mitigate
 *      brute-force and account-spam attacks.
 *   3. Defence-in-depth security headers on every response.
 *
 * The middleware uses only edge-safe APIs (jsonwebtoken is pure JS, no
 * Prisma). The JWT carries a `role` claim so admin authorisation does not
 * require a database lookup here; the DB Session row remains the source of
 * truth for session validity and is re-checked by every route handler.
 */

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "nassim_sid";

/* ------------------------------------------------------------------ */
/* In-memory rate limiting (per-edge-instance sliding window)          */
/* ------------------------------------------------------------------ */

interface Bucket {
  hits: number[];
}
const rateBuckets = new Map<string, Bucket>();

function rateLimit(key: string, max: number, windowMs: number): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const bucket = rateBuckets.get(key);
  const hits = bucket ? bucket.hits.filter((t) => t > cutoff) : [];
  if (hits.length >= max) {
    return { allowed: false, retryAfterMs: Math.max(0, hits[0] + windowMs - now) };
  }
  hits.push(now);
  rateBuckets.set(key, { hits });
  return { allowed: true, retryAfterMs: 0 };
}

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip")?.trim() ?? "unknown";
}

/* ------------------------------------------------------------------ */
/* Security headers                                                    */
/* ------------------------------------------------------------------ */

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-DNS-Prefetch-Control": "on",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  "X-XSS-Protection": "1; mode=block",
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Page-gate role check. SECURITY: the signed token is VERIFIED whenever
 * JWT_SECRET is available — a forged unsigned JWT with an admin/owner role
 * claim must never pass the gate. The unsigned jwt.decode fallback exists
 * only for the documented dev edge case where the secret is not propagated
 * to the edge runtime; the real enforcement (signature + DB session check)
 * always happens in every API route via requireStaff()/requireAdmin()/
 * requireOwner(), so this gate remains defence-in-depth, not the authority.
 */
function hasRoleToken(token: string | undefined, allowed: (string | undefined)[]): boolean {
  if (!token) return false;
  try {
    if (JWT_SECRET) {
      try {
        const verified = jwt.verify(token, JWT_SECRET) as { role?: string };
        return allowed.includes(verified.role);
      } catch {
        // Signature invalid/expired — reject outright. Never fall back to an
        // unsigned decode when the secret is available: that would let a
        // forged token through.
        return false;
      }
    }
    // No secret in this runtime (dev edge case): fall back to the unsigned
    // claim. API routes still fully verify before doing anything sensitive.
    const decoded = jwt.decode(token) as { role?: string } | null;
    return !!decoded && allowed.includes(decoded.role);
  } catch {
    return false;
  }
}

function isAdminToken(token: string | undefined): boolean {
  return hasRoleToken(token, ["ADMIN", "STAFF", "SUPERADMIN"]);
}

/**
 * Owner page-gate check: only a SUPERADMIN role claim may load /superadmin/*.
 * Like isAdminToken this is defence-in-depth — every /api/superadmin/* route
 * enforces requireOwner() server-side with full signature verification.
 */
function isOwnerToken(token: string | undefined): boolean {
  return hasRoleToken(token, ["SUPERADMIN"]);
}

function jsonError(status: number, error: string, retryAfterSec?: number): NextResponse {
  return NextResponse.json(
    { success: false, data: null, error },
    {
      status,
      headers: retryAfterSec ? { "Retry-After": String(Math.ceil(retryAfterSec)) } : undefined,
    }
  );
}

/* ------------------------------------------------------------------ */
/* Middleware                                                          */
/* ------------------------------------------------------------------ */

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Admin page gate — block the React admin shell at the edge.
  //    API routes under /api/admin/* enforce their own requireStaff() gate;
  //    this protects the page chrome from rendering for unauthenticated users.
  //    Allow the login page itself to pass through.
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!isAdminToken(token)) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 1b. Superadmin (owner) page gate — only SUPERADMIN may load the owner
  //     dashboard shell. /api/superadmin/* routes enforce requireOwner()
  //     server-side; this gate protects the page chrome. The owner login
  //     page itself passes through.
  if (pathname.startsWith("/superadmin") && pathname !== "/superadmin/login") {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!isOwnerToken(token)) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/superadmin/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Rate limit auth endpoints.
  if (pathname === "/api/auth/login" || pathname === "/api/auth/register") {
    const ip = clientIp(req);
    const result = rateLimit(`${ip}:${pathname}`, 10, 60_000); // 10 req / minute / IP / endpoint
    if (!result.allowed) {
      return jsonError(429, "Too many requests. Please try again later.", result.retryAfterMs / 1000);
    }
  }

  // 2b. CSRF defence-in-depth: state-changing API calls must originate from
  //     this site. The session cookie is SameSite=Strict (the primary CSRF
  //     mitigation — see docs/SECURITY-NOTES.md); this Origin check adds a
  //     second, independent layer for browsers that send Origin (all modern
  //     ones do on cross-site POSTs). Requests WITHOUT an Origin header (curl,
  //     server-to-server) are allowed through — they cannot carry the
  //     HttpOnly session cookie cross-site in a CSRF attack scenario that
  //     SameSite doesn't already cover.
  if (
    pathname.startsWith("/api/") &&
    ["POST", "PATCH", "PUT", "DELETE"].includes(req.method)
  ) {
    const origin = req.headers.get("origin");
    if (origin) {
      const host = req.headers.get("host");
      let originHost: string | null = null;
      try {
        originHost = new URL(origin).host;
      } catch {
        originHost = null;
      }
      if (!originHost || !host || originHost !== host) {
        return jsonError(403, "Cross-origin request rejected.");
      }
    }
  }

  // 3. Apply security headers to every response.
  const res = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}

export const config = {
  /**
   * Run on all paths except static assets and the public API reads that
   * don't need protection. Keeping the matcher broad ensures the admin gate
   * and security headers apply everywhere.
   */
  matcher: [
    /*
     * Match all paths except:
     *   - _next/static, _next/image, favicon
     *   - public assets (uploads, topcar, advertisment, LOGO)
     */
    "/((?!_next/static|_next/image|favicon\\.svg|LOGO\\.png|uploads|topcar|advertisment|categories|assets).*)",
  ],
};
