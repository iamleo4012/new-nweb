/* AL-NASSIM staff Web Push service worker.
 *
 * Served from the site root (/sw.js) so its scope is "/" — the browser keeps
 * it registered and delivers `push` events here even when the Staff Orders
 * page (/internal-orders.html) is closed, backgrounded, or the phone screen
 * is locked. The payload is built server-side (lib/web-push.ts) at the
 * moment a genuinely NEW order is created.
 *
 * Payload shape:
 *   { title, body, tag, url }
 *     title — "New Order Received"
 *     body  — "AN-2026-000282 — Customer · KD 25.500"
 *     tag   — "new-order-AN-2026-000282" (dedupes repeated pushes per order)
 *     url   — "/internal-orders.html?order=AN-2026-000282" (tap target)
 */

self.addEventListener("install", function (event) {
  // Activate immediately — there is no old-version state to migrate.
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  // Take control of all open pages right away.
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    // Malformed payload: fall back to a generic alert, never fail silently.
    data = { title: "New Order Received", body: "", tag: "new-order", url: "/internal-orders.html" };
  }

  var title = data.title || "New Order Received";
  var options = {
    body: data.body || "",
    icon: "/LOGO.png",
    badge: "/LOGO.png",
    tag: data.tag || "new-order",
    // Replacing a same-tag notification keeps the lock screen to ONE alert
    // per order; renotify makes the replacement vibrate/alert again.
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 150, 300],
    data: { url: data.url || "/internal-orders.html" },
    actions: [{ action: "open", title: "View Order" }],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || "/internal-orders.html";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      // Focus an already-open Staff Orders window if one exists…
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf("/internal-orders") !== -1 && "focus" in client) {
          // Post the deep link so the open page can jump to the order.
          client.postMessage({ type: "open-order", url: url });
          return client.focus();
        }
      }
      // …otherwise open a new one (typical when tapped from the lock screen).
      return self.clients.openWindow(url);
    })
  );
});
