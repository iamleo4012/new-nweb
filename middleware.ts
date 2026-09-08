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
/* Edge-safe JWT verification (Web Crypto)                             */
/* ------------------------------------------------------------------ */

/**
 * The middleware runs on the EDGE runtime, where the `jsonwebtoken` package
 * cannot execute (it needs node:crypto's createHmac; jwt.verify always throws
 * there). Verification is therefore done with Web Crypto (crypto.subtle),
 * which IS available on the edge and verifies the same HS256 signature that
 * lib/auth.ts produces with jsonwebtoken on the Node side.
 */
const enc = new TextEncoder();

function base64UrlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

let hmacKey: Promise<CryptoKey> | null = null;
function getHmacKey(): Promise<CryptoKey> {
  if (!hmacKey) {
    hmacKey = crypto.subtle.importKey(
      "raw",
      enc.encode(JWT_SECRET as string),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
  }
  return hmacKey;
}

/** Verify an HS256 session JWT with Web Crypto. Returns the payload only if
 *  the signature is valid, the algorithm is HS256, and exp has not passed. */
async function verifyJwtEdge(token: string): Promise<{ role?: string } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0])));
    // Algorithm allowlist — never accept "none"/other algs.
    if (header?.alg !== "HS256") return null;
    const key = await getHmacKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(parts[2]),
      enc.encode(`${parts[0]}.${parts[1]}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1])));
    if (typeof payload?.exp === "number" && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Page-gate role check. SECURITY: the signed token is VERIFIED whenever
 * JWT_SECRET is available — a forged unsigned JWT with an admin role
 * claim must never pass the gate. The unsigned jwt.decode fallback exists
 * only for the documented dev edge case where the secret is not propagated
 * to the edge runtime; the real enforcement (signature + DB session check)
 * always happens in every API route via requireStaff()/requireAdmin(),
 * so this gate remains defence-in-depth, not the authority.
 */
async function hasRoleToken(token: string | undefined, allowed: (string | undefined)[]): Promise<boolean> {
  if (!token) return false;
  if (JWT_SECRET) {
    const payload = await verifyJwtEdge(token);
    // Invalid signature/expired/malformed — reject outright. Never fall back
    // to an unsigned decode when the secret is available: that would let a
    // forged token through.
    if (!payload) return false;
    return allowed.includes(payload.role);
  }
  // No secret in this runtime (dev edge case): fall back to the unsigned
  // claim. API routes still fully verify before doing anything sensitive.
  try {
    const decoded = jwt.decode(token) as { role?: string } | null;
    return !!decoded && allowed.includes(decoded.role);
  } catch {
    return false;
  }
}

async function isAdminToken(token: string | undefined): Promise<boolean> {
  return hasRoleToken(token, ["ADMIN", "STAFF"]);
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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Admin page gate — block the React admin shell at the edge.
  //    API routes under /api/admin/* enforce their own requireStaff()/
  //    requireAdmin() gates; this protects the page chrome from rendering
  //    for unauthenticated users. Allow the login page itself to pass through.
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!(await isAdminToken(token))) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
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
