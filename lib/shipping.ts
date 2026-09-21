/**
 * Server-authoritative shipping fee (KWD).
 *
 * Business rule (2026-09-12):
 *   - Orders with a subtotal BELOW the free-shipping threshold pay a flat fee
 *     (default 1.000 KWD).
 *   - Orders AT or ABOVE the threshold ship free (default 0.000 KWD).
 *   - There is no tax/VAT calculation at this stage.
 *
 * The threshold and both fees are configurable via the Setting table
 * (keys "shipping_threshold", "shipping_fee_below_threshold",
 * "shipping_fee_at_or_above") so operations can tune them without a deploy.
 * Invalid stored values fall back to the defaults below.
 *
 * The browser is NEVER trusted for financial values: checkout sends no
 * shipping value, and the fee is derived from the SERVER-side subtotal
 * (product prices read from the database), so a tampered payload cannot
 * change the order total.
 */
import { prisma } from "@/lib/db";

export const DEFAULT_SHIPPING_THRESHOLD = 20;
export const DEFAULT_SHIPPING_FEE_BELOW = 1;
export const DEFAULT_SHIPPING_FEE_AT_OR_ABOVE = 0;

export interface ShippingRule {
  /** Subtotal at or above this amount ships free. */
  threshold: number;
  /** Flat fee when the subtotal is below the threshold. */
  feeBelow: number;
  /** Fee when the subtotal is at or above the threshold (normally 0). */
  feeAtOrAbove: number;
}

async function readSettingNumber(key: string): Promise<number | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return null;
  const v = Number(row.value);
  return Number.isFinite(v) && v >= 0 && v <= 1000 ? v : null;
}

export async function getShippingRule(): Promise<ShippingRule> {
  const [threshold, feeBelow, feeAtOrAbove] = await Promise.all([
    readSettingNumber("shipping_threshold"),
    readSettingNumber("shipping_fee_below_threshold"),
    readSettingNumber("shipping_fee_at_or_above"),
  ]);
  return {
    threshold: threshold ?? DEFAULT_SHIPPING_THRESHOLD,
    feeBelow: feeBelow ?? DEFAULT_SHIPPING_FEE_BELOW,
    feeAtOrAbove: feeAtOrAbove ?? DEFAULT_SHIPPING_FEE_AT_OR_ABOVE,
  };
}

/**
 * The shipping fee for a given SERVER-side order subtotal (KWD).
 * The boundary is inclusive: subtotal >= threshold → free.
 */
export function computeShipping(subtotal: number, rule: ShippingRule): number {
  return subtotal < rule.threshold ? rule.feeBelow : rule.feeAtOrAbove;
}
