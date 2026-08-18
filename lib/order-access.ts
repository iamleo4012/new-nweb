/**
 * Guest order-tracking capability tokens.
 *
 * The raw token (32 chars, 192 bits of entropy from randomBytes(24)) is
 * returned ONCE in the checkout response so the customer can build an
 * unguessable tracking link (order-detail.html?number=…&token=…). Only the
 * SHA-256 hash is stored (OrderSecurity.tokenHash) — the raw value is never
 * persisted and never logged.
 *
 * Guests must present the raw token to view or confirm an order. The
 * sequential order id / order number alone grants nothing, so mass PII
 * enumeration of orders is impossible. Authenticated customers and staff
 * never need the token (session-based access).
 */
import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export function generateOrderAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashOrderAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Resolve an order for a guest presenting a raw capability token.
 * Returns the order (with items and timeline) iff the token's hash matches a
 * stored OrderSecurity row. Callers that addressed a specific order id or
 * order number must additionally verify the match (the token is authoritative).
 */
export async function findOrderByAccessToken(
  rawToken: string,
  include: Prisma.OrderInclude
) {
  const sec = await prisma.orderSecurity.findUnique({
    where: { tokenHash: hashOrderAccessToken(rawToken) },
  });
  if (!sec) return null;
  return prisma.order.findUnique({
    where: { orderNumber: sec.orderNumber },
    include,
  });
}
