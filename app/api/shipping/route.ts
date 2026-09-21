import { NextResponse } from "next/server";
import { getShippingRule } from "@/lib/shipping";

export const dynamic = "force-dynamic";

/**
 * Public, non-sensitive shipping rule for storefront DISPLAY ONLY (cart and
 * checkout summaries). The authoritative fee is always recomputed server-side
 * at order creation from DB product prices — this endpoint only keeps what the
 * customer sees in sync with the configured rule.
 */
export async function GET() {
  const rule = await getShippingRule();
  return NextResponse.json({
    success: true,
    data: { currency: "KD", ...rule },
    error: null,
  });
}
