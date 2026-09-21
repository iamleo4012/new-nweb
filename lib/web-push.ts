/**
 * Server-side Web Push (staff new-order notifications).
 *
 * STORAGE — no schema change: subscriptions live in the EXISTING Setting
 * key/value table under "staff_push_subscriptions" as a JSON array (same
 * pattern lib/shipping.ts already uses for shipping config). Each record
 * carries the owning staff userId, so subscriptions are bound to the
 * authenticated staff account/device and are never exposed to customers.
 * Multiple devices per staff account are supported: one record per
 * endpoint, and subscribing on a new device never removes another.
 *
 * SECURITY — the VAPID private key is read from the server-side
 * environment only (never sent to the browser); every mutation below is
 * called from routes gated by requireStaff().
 */
import webpush from "web-push";
import { prisma } from "@/lib/db";

const SETTING_KEY = "staff_push_subscriptions";

/** One staff device subscription as persisted in the Setting row. */
export interface StoredPushSubscription {
  /** Push-service endpoint URL — the stable unique id of a subscription. */
  endpoint: string;
  keys: { p256dh: string; auth: string };
  /** Staff account that registered this device. */
  userId: number;
  /** Device-local ON/OFF preference mirrored from the Staff Orders page. */
  paused: boolean;
  createdAt: string;
}

/** Raw PushSubscription JSON accepted from the staff device. */
export interface IncomingPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@alnassim.com", publicKey, privateKey);
  configured = true;
  return true;
}

/** Public VAPID key for the browser's pushManager.subscribe(). Safe to send
 *  to authenticated staff — it is a public key by design; the private key
 *  never leaves the server. Returns null when push is not configured. */
export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

/** True when the route may attempt actual push delivery. */
export function isWebPushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

async function listSubscriptions(): Promise<StoredPushSubscription[]> {
  const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  if (!row) return [];
  try {
    const parsed = JSON.parse(row.value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is StoredPushSubscription =>
        typeof s?.endpoint === "string" &&
        typeof s?.keys?.p256dh === "string" &&
        typeof s?.keys?.auth === "string" &&
        Number.isInteger(s?.userId)
    );
  } catch {
    return [];
  }
}

async function saveSubscriptions(list: StoredPushSubscription[]): Promise<void> {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(list) },
    create: { key: SETTING_KEY, value: JSON.stringify(list) },
  });
}

function isValidSubscription(sub: IncomingPushSubscription): boolean {
  return (
    typeof sub?.endpoint === "string" &&
    /^https:\/\//.test(sub.endpoint) &&
    sub.endpoint.length <= 2048 &&
    typeof sub?.keys?.p256dh === "string" &&
    sub.keys.p256dh.length > 0 &&
    sub.keys.p256dh.length <= 256 &&
    typeof sub?.keys?.auth === "string" &&
    sub.keys.auth.length > 0 &&
    sub.keys.auth.length <= 256
  );
}

/**
 * Register/refresh the calling staff device's subscription. Deduplicated by
 * endpoint: re-subscribing the same device updates its keys and re-enables
 * it; OTHER devices' records are untouched (multi-device support).
 */
export async function upsertSubscription(
  userId: number,
  incoming: IncomingPushSubscription
): Promise<{ ok: boolean; error?: string }> {
  if (!isValidSubscription(incoming)) return { ok: false, error: "Invalid push subscription" };
  const list = await listSubscriptions();
  const existing = list.find((s) => s.endpoint === incoming.endpoint);
  if (existing) {
    existing.keys = incoming.keys;
    existing.userId = userId;
    existing.paused = false; // explicit (re)subscribe re-enables this device
  } else {
    list.push({ endpoint: incoming.endpoint, keys: incoming.keys, userId, paused: false, createdAt: new Date().toISOString() });
  }
  await saveSubscriptions(list);
  return { ok: true };
}

/**
 * Mirror the device's Notifications & Sound toggle onto its stored
 * subscription. A paused device receives NO web push for new orders while
 * the (device-local) toggle is OFF; unpausing resumes for future orders
 * only — nothing is replayed because pushes are event-driven at order
 * creation, never list-diffed. Caller may only touch its own endpoint.
 */
export async function setSubscriptionPaused(
  userId: number,
  endpoint: string,
  paused: boolean
): Promise<boolean> {
  const list = await listSubscriptions();
  const own = list.find((s) => s.endpoint === endpoint && s.userId === userId);
  if (!own) return false;
  own.paused = paused;
  await saveSubscriptions(list);
  return true;
}

/** Remove the calling staff device's own subscription (Sign out / disable). */
export async function removeSubscription(userId: number, endpoint: string): Promise<boolean> {
  const list = await listSubscriptions();
  const next = list.filter((s) => !(s.endpoint === endpoint && s.userId === userId));
  if (next.length === list.length) return false;
  await saveSubscriptions(next);
  return true;
}

export interface NewOrderPushInfo {
  orderNumber: string;
  customerName: string;
  total: number;
  currency: string;
}

/**
 * Fire a system push notification to every non-paused staff device when a
 * GENUINELY new order is created (called only from the order-creation
 * commit path — never for existing/historical orders). Push failures never
 * throw into checkout; dead endpoints (404/410 gone) are pruned so the
 * stored list self-cleans as staff devices change browsers/uninstall.
 */
export async function notifyStaffOfNewOrder(order: NewOrderPushInfo): Promise<void> {
  try {
    if (!isWebPushConfigured() || !ensureConfigured()) return;
    const list = await listSubscriptions();
    const active = list.filter((s) => !s.paused);
    if (active.length === 0) return;

    const payload = JSON.stringify({
      title: "New Order Received",
      body: `${order.orderNumber} — ${order.customerName} · ${order.currency} ${Number(order.total).toFixed(3)}`,
      tag: `new-order-${order.orderNumber}`,
      url: `/internal-orders.html?order=${encodeURIComponent(order.orderNumber)}`,
    });

    let pruned = false;
    await Promise.all(
      active.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: s.keys } as webpush.PushSubscription,
            payload,
            { urgency: "high" }
          );
        } catch (err) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            // Subscription expired/revoked — drop just this device.
            await saveSubscriptions((await listSubscriptions()).filter((x) => x.endpoint !== s.endpoint));
            pruned = true;
          }
          // Transient push-service errors are logged and skipped.
          console.error(`Web Push to ${s.endpoint.slice(0, 48)}… failed:`, statusCode ?? err);
        }
      })
    );
    if (pruned) console.log("Web Push: pruned expired staff subscription(s).");
  } catch (err) {
    // NEVER let push problems affect order creation.
    console.error("Web Push notifyStaffOfNewOrder error:", err);
  }
}
