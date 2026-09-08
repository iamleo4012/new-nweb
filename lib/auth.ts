import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET missing in environment");
export const SECRET: string = JWT_SECRET;

export const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "nassim_sid";
const SESSION_DAYS = 30;

export async function createSession(userId: number, role: string): Promise<string> {
  const sid = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { id: sid, userId, expiresAt } });
  // The role is embedded in the JWT so the edge middleware can authorise
  // /admin requests without a database lookup. The DB Session row remains
  // the source of truth for validity; the role claim is only a hint that
  // is re-checked on every route handler via getSessionUser().
  const token = jwt.sign({ uid: userId, sid, role }, SECRET, { expiresIn: `${SESSION_DAYS}d` });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    // "strict" prevents the cookie from being sent on cross-site requests,
    // which is the primary CSRF mitigation. An Origin check in middleware for
    // state-changing /api/* requests adds a second, independent layer (see
    // docs/SECURITY-NOTES.md for the full CSRF assessment).
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return sid;
}

/**
 * Read the raw session JWT from the cookie without verifying it. Used by
 * CSRF verification (which needs the raw token to recompute the HMAC).
 * Returns null if no cookie is present.
 */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  let payload: { uid: number; sid: string; role?: string };
  try {
    payload = jwt.verify(token, SECRET) as { uid: number; sid: string; role?: string };
  } catch {
    return null;
  }
  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  return session.user;
}

/**
 * Id of the CURRENT session (from the verified cookie), or null. Used by
 * account-security mutations that revoke a user's other sessions but must
 * keep the acting user's own session alive (e.g. an owner rotating their own
 * password through the employee manager).
 */
export async function getSessionId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, SECRET) as { sid: string };
    return payload.sid;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    try {
      const payload = jwt.verify(token, SECRET) as { sid: string };
      await prisma.session.deleteMany({ where: { id: payload.sid } });
    } catch {
      // invalid token — nothing to delete
    }
  }
  store.delete(COOKIE_NAME);
}

export function publicUser(u: User) {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role };
}

/**
 * Gate for any staff route (ADMIN or STAFF). Use this for read access and
 * routine operations that both roles may perform (order management,
 * customer lookups needed to process orders, dashboard stats).
 */
export async function requireStaff(): Promise<User | null> {
  const user = await getSessionUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) return null;
  return user;
}

/**
 * Strict gate for ADMIN-level operations. STAFF users are denied even though
 * they pass requireStaff. Use this for destructive or privilege-escalating
 * actions: catalog and master-data mutations, uploads, staff management,
 * deactivating accounts, etc. The production role model has exactly one
 * active ADMIN; SUPERADMIN is no longer admitted anywhere.
 */
export async function requireAdmin(): Promise<User | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

/**
 * Owner gate for the Superadmin dashboard APIs. SUPERADMIN only — every
 * /api/superadmin/* handler MUST call this first; USER and ADMIN receive 403.
 * This is the server-side security boundary (frontend hiding is cosmetic).
 */
export async function requireOwner(): Promise<User | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPERADMIN") return null;
  return user;
}
