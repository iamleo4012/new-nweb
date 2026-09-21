import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import {
  getVapidPublicKey,
  upsertSubscription,
  setSubscriptionPaused,
  removeSubscription,
} from "@/lib/web-push";

export const dynamic = "force-dynamic";

/**
 * Staff-only Web Push subscription management for the Store Orders page.
 * requireStaff() (ADMIN | STAFF, verified session) gates EVERY method —
 * push is never exposed to customers or anonymous users. The middleware
 * Origin check adds CSRF defence for the mutating methods.
 *
 *   GET    — VAPID public key (needed by pushManager.subscribe in the browser).
 *   POST   — register/refresh this device's subscription (creates push).
 *   PATCH  — mirror the device's Notifications & Sound toggle (pause/resume).
 *   DELETE — remove this device's subscription.
 */

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(256),
  }),
});

const endpointSchema = z.object({
  endpoint: z.string().url().max(2048),
});

const pauseSchema = endpointSchema.extend({ paused: z.boolean() });

export async function GET() {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ success: false, data: null, error: "Staff access required" }, { status: 401 });
  }
  const publicKey = getVapidPublicKey();
  return NextResponse.json(
    { success: true, data: { publicKey }, error: null },
    { status: publicKey ? 200 : 503 }
  );
}

export async function POST(req: Request) {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ success: false, data: null, error: "Staff access required" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid request body" }, { status: 400 });
  }
  const parsed = subscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: "Invalid push subscription" }, { status: 400 });
  }
  const result = await upsertSubscription(user.id, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ success: false, data: null, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, data: null, error: null });
}

export async function PATCH(req: Request) {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ success: false, data: null, error: "Staff access required" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid request body" }, { status: 400 });
  }
  const parsed = pauseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: "Invalid request" }, { status: 400 });
  }
  // Ownership enforced inside: only the caller's OWN device record moves.
  const updated = await setSubscriptionPaused(user.id, parsed.data.endpoint, parsed.data.paused);
  if (!updated) {
    return NextResponse.json({ success: false, data: null, error: "Subscription not found for this account" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: null, error: null });
}

export async function DELETE(req: Request) {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ success: false, data: null, error: "Staff access required" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid request body" }, { status: 400 });
  }
  const parsed = endpointSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: "Invalid request" }, { status: 400 });
  }
  const removed = await removeSubscription(user.id, parsed.data.endpoint);
  if (!removed) {
    return NextResponse.json({ success: false, data: null, error: "Subscription not found for this account" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: null, error: null });
}
