/**
 * Server-authoritative shipping fee (KWD).
 *
 * The browser is NEVER trusted for financial values: the `shipping` value in
 * a checkout payload is ignored entirely and the fee is derived here, so a
 * tampered request cannot change the order total. Operations can override the
 * flat fee via the Setting table (key "shipping_fee"); invalid stored values
 * fall back to the default instead of ever trusting the client.
 */
import { prisma } from "@/lib/db";

export const DEFAULT_SHIPPING_FEE = 2.5;

export async function getShippingFee(): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key: "shipping_fee" } });
  if (row) {
    const v = Number(row.value);
    if (Number.isFinite(v) && v >= 0 && v <= 100) return v;
  }
  return DEFAULT_SHIPPING_FEE;
}
