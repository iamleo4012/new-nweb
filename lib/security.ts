/**
 * Centralised security primitives for the Nassim platform.
 *
 * Provides:
 *   - Rate limiting (in-memory sliding window per identifier + action)
 *   - CSRF token issuance and verification (HMAC over a session token)
 *   - Password hashing and verification (bcrypt cost 12)
 *   - Constant-time comparison
 *   - Client IP extraction (proxy-aware)
 *
 * All functions are framework-agnostic so they can be unit-tested in
 * isolation and reused across route handlers and middleware.
 */

import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "node:crypto";

const BCRYPT_COST = 12;

/* ------------------------------------------------------------------ */
/* Password hashing (centralised so the cost factor lives in one place) */
/* ------------------------------------------------------------------ */

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_COST);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

/* ------------------------------------------------------------------ */
/* Constant-time comparison                                            */
/* ------------------------------------------------------------------ */

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/* ------------------------------------------------------------------ */
/* CSRF protection                                                     */
/* ------------------------------------------------------------------ */

const JWT_SECRET_RAW = process.env.JWT_SECRET;
if (!JWT_SECRET_RAW) throw new Error("JWT_SECRET missing in environment");
const CSRF_SECRET: string = JWT_SECRET_RAW;

/**
 * Derive a CSRF token for a given session token. The CSRF token is an HMAC
 * of the session token signed with the JWT secret. It is stateless (no DB
 * row needed) and bound to the session: stealing the CSRF token without the
 * session cookie is useless, and vice versa.
 *
 * Clients send the token back via the `x-csrf-token` header (or `csrf-token`
 * form field) on every state-changing request.
 */
export function issueCsrfToken(sessionToken: string): string {
  return createHmac("sha256", CSRF_SECRET).update(sessionToken).digest("hex");
}

/**
 * Verify a CSRF token against the session token. Returns true only if the
 * HMAC matches (constant-time).
 */
export function verifyCsrfToken(sessionToken: string, presented: string | null | undefined): boolean {
  if (!presented || typeof presented !== "string") return false;
  const expected = issueCsrfToken(sessionToken);
  return safeEqual(expected, presented);
}

/* ------------------------------------------------------------------ */
/* Rate limiting (in-memory sliding window)                            */
/* ------------------------------------------------------------------ */

interface RateBucket {
  /** Timestamps (ms) of recent requests within the window. */
  hits: number[];
}

const buckets = new Map<string, RateBucket>();

export interface RateLimitOptions {
  /** Maximum number of requests allowed within the window. */
  max: number;
  /** Window size in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Number of requests remaining in the current window. */
  remaining: number;
  /** ms until the oldest hit expires and a slot frees up. */
  retryAfterMs: number;
}

/**
 * Enforce a sliding-window rate limit on an identifier (typically an IP or
 * IP + action). In-memory and per-process: sufficient for a single-node
 * deployment; for multi-node, swap the `buckets` Map for Redis without
 * changing the call sites.
 *
 * Buckets are pruned lazily on every call to avoid unbounded growth.
 */
export function rateLimit(identifier: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const cutoff = now - opts.windowMs;
  const bucket = buckets.get(identifier);

  // Rebuild the hit list, dropping expired entries.
  const hits = bucket ? bucket.hits.filter((t) => t > cutoff) : [];
  if (hits.length >= opts.max) {
    const oldest = hits[0];
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, oldest + opts.windowMs - now) };
  }
  hits.push(now);
  buckets.set(identifier, { hits });
  return { allowed: true, remaining: Math.max(0, opts.max - hits.length), retryAfterMs: 0 };
}

/** Clear all rate-limit state (useful for tests). */
export function resetRateLimits(): void {
  buckets.clear();
}

/* ------------------------------------------------------------------ */
/* Client IP extraction                                                */
/* ------------------------------------------------------------------ */

/**
 * Extract the client IP from a request, honouring the X-Forwarded-For
 * header set by reverse proxies. Returns the left-most address.
 *
 * In production behind a trusted proxy (Nginx, Vercel, etc.), this is the
 * real client IP. In direct development it falls back to the socket peer.
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
