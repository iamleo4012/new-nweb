import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET missing in environment");
const SECRET: string = JWT_SECRET;

export const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "nassim_sid";
const SESSION_DAYS = 30;

export async function createSession(userId: number): Promise<string> {
  const sid = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { id: sid, userId, expiresAt } });
  const token = jwt.sign({ uid: userId, sid }, SECRET, { expiresIn: `${SESSION_DAYS}d` });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return sid;
}

export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  let payload: { uid: number; sid: string };
  try {
    payload = jwt.verify(token, SECRET) as { uid: number; sid: string };
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

export async function requireStaff(): Promise<User | null> {
  const user = await getSessionUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) return null;
  return user;
}
