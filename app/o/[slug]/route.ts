import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { STATUS_LABELS, calculateBillableTotals } from "@/lib/order-workflow";
import { verifyOrderShortSlug } from "@/lib/order-link";
import type { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /o/{id}-{signature} — signed short link to the customer Order Sent page.
 *
 * Resolves the order SERVER-SIDE (no token in any URL, nothing exposed in the
 * address bar) and serves public/customer-order.html with the order
 * data injected as an inline global the page already understands. The page's
 * own fetch/API/token mechanism is untouched; regular tokenized links keep
 * working exactly as before.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const id = verifyOrderShortSlug(slug);
  if (!id) {
    return new NextResponse(notFoundHtml("This order link is invalid."), { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  }
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, statusHistory: { orderBy: { createdAt: "asc" as const } } },
  });
  if (!order) {
    return new NextResponse(notFoundHtml("Order not found."), { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  }
  const payload = {
    success: true,
    data: {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        statusLabel: STATUS_LABELS[order.status as OrderStatus] ?? order.status,
        staffNotes: order.staffNotes,
        posStatus: order.posStatus,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        address: order.address,
        city: order.city,
        notes: order.notes,
        currency: order.currency,
        ...calculateBillableTotals(
          order.items.map((i) => ({ price: i.price, quantity: i.quantity, itemStatus: i.itemStatus })),
          order.shipping
        ),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: order.items.map((i) => ({
          id: i.id,
          slug: i.slug,
          name: i.name,
          image: i.image,
          price: Number(i.price),
          quantity: i.quantity,
          itemStatus: i.itemStatus,
        })),
        timeline: order.statusHistory.map((e) => ({
          status: e.status,
          statusLabel: STATUS_LABELS[e.status as OrderStatus] ?? e.status,
          note: e.note,
          createdAt: e.createdAt,
        })),
      },
    },
    error: null,
  };
  // Inject the payload BEFORE any page script runs; customer-order.html
  // renders it directly from this global (no token needed or shown). The
  // page is the customer WhatsApp order page: website header + the EXACT
  // staff View Order document sheet (same markup/design as internal-orders2).
  const safeJson = JSON.stringify(payload).replace(/<\//g, "<\/");
  let html: string;
  try {
    html = readFileSync(join(process.cwd(), "public", "customer-order.html"), "utf8");
  } catch {
    return new NextResponse("Order page unavailable.", { status: 500 });
  }
  // <base href="/"> makes every relative asset/link in the page resolve
  // from the site root (e.g. LOGO.png → /LOGO.png, home.html → /home.html)
  // instead of under /o/ — which caused asset 404s and made normal
  // navigation hit the /o/[slug] route ("order link invalid").
  const inject = '<base href="/">' +
    "<script>window.__NASSIM_ORDER__=" + safeJson + "</script>";
  html = html.includes("<head>") ? html.replace("<head>", "<head>" + inject) : inject + html;
  return new NextResponse(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}

function notFoundHtml(message: string): string {
  return "<!DOCTYPE html><html><head><meta charset='utf-8'><title>AL-NASSIM</title>"
    + "<meta name='viewport' content='width=device-width, initial-scale=1'></head>"
    + "<body style='font-family:sans-serif;text-align:center;padding:4rem 1rem;color:#111d27'>"
    + "<h2 style='margin-bottom:.5rem'>" + message + "</h2>"
    + "<p style='color:#6b7280'>Please use the link from your order confirmation or contact the store.</p>"
    + "</body></html>";
}
