/**
 * AL-NASSIM Checkout Logic (Sprint 3)
 * ============================================================================
 * - Reads cart from localStorage (guest) or falls back gracefully.
 * - Auto-populates form fields when logged in.
 * - Builds full address from Kuwait address components.
 * - Supports guest checkout (email optional) + registered checkout.
 * - Prevents double submission with loading state.
 * - Clears cart after successful order.
 * ============================================================================
 */
(function () {
  "use strict";
  var CART_KEY = "nassim_cart";
  var IDEM_KEY = "nassim_checkout_idem";
  var submitting = false;

  /* Shipping rule for DISPLAY ONLY — same defaults as the server
     (lib/shipping.ts). Fetched from /api/shipping so a settings change is
     reflected without editing this file; the server recomputes the real fee
     from DB prices at order creation and never trusts the browser. */
  var SHIPPING_RULE = { threshold: 20, feeBelow: 1, feeAtOrAbove: 0 };
  fetch("/api/shipping", { credentials: "same-origin" })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d && d.success && d.data) {
        SHIPPING_RULE = {
          threshold: Number(d.data.threshold) || SHIPPING_RULE.threshold,
          feeBelow: Number(d.data.feeBelow) || 0,
          feeAtOrAbove: Number(d.data.feeAtOrAbove) || 0
        };
        renderSummary();
      }
    })
    .catch(function () {});
  function shippingFor(subtotal) { return subtotal < SHIPPING_RULE.threshold ? SHIPPING_RULE.feeBelow : SHIPPING_RULE.feeAtOrAbove; }

  function readStore(key) { try { var raw = localStorage.getItem(key); if (!raw) return null; var p = JSON.parse(raw); return p && p.state ? p.state : p; } catch (e) { return null; } }
  function getCart() { var s = readStore(CART_KEY); return s && s.items ? s.items : []; }
  function formatKd(v, c) { return (c || "KD") + " " + Number(v).toFixed(3); }
  /* Escape DB/product-controlled values before insertion into innerHTML. */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* One idempotency key per checkout submission. Survives a page refresh or a
     retry after a lost network response, so the server can recognise a replay
     (double-click, retry, refresh) and return the original order instead of
     creating a duplicate. Cleared after a successful order — the next checkout
     gets a fresh key. */
  function getIdempotencyKey() {
    try {
      var k = sessionStorage.getItem(IDEM_KEY);
      if (k && /^[A-Za-z0-9_-]{8,80}$/.test(k)) return k;
      k = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID()
        : "ck-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(IDEM_KEY, k);
      return k;
    } catch (e) { return null; }
  }
  function clearIdempotencyKey() { try { sessionStorage.removeItem(IDEM_KEY); } catch (e) {} }

  function buildAddress() {
    var parts = [];
    var area = (document.getElementById("cust-area") || {}).value || "";
    var block = (document.getElementById("cust-block") || {}).value || "";
    var street = (document.getElementById("cust-street") || {}).value || "";
    var building = (document.getElementById("cust-building") || {}).value || "";
    var floor = (document.getElementById("cust-floor") || {}).value || "";
    var apartment = (document.getElementById("cust-apartment") || {}).value || "";
    var landmark = (document.getElementById("cust-landmark") || {}).value || "";
    if (area) parts.push("Area: " + area);
    if (block) parts.push("Block: " + block);
    if (street) parts.push("Street: " + street);
    if (building) parts.push("Building: " + building);
    if (floor) parts.push("Floor: " + floor);
    if (apartment) parts.push("Apartment: " + apartment);
    if (landmark) parts.push("Landmark: " + landmark);
    return parts.join(", ");
  }

  /* Order summary — shipping follows the same threshold rule the server
     applies at order creation (below threshold → flat fee, otherwise free). */
  function renderSummary() {
    var items = getCart();
    if (items.length === 0) return;
    var subtotal = items.reduce(function (s, i) { return s + (i.price * (i.quantity || 1)); }, 0);
    var shipping = shippingFor(subtotal);
    var total = subtotal + shipping;
    var summaryEl = document.getElementById("checkout-summary");
    if (!summaryEl) return;
    var html = items.map(function (i) {
      return '<div class="flex justify-between items-center py-3 border-b border-outline-variant/20"><div class="flex items-center gap-3"><div class="w-12 h-12 bg-surface-container rounded-lg overflow-hidden flex-shrink-0">' + (i.image ? '<img src="' + esc(i.image) + '" alt="" class="w-full h-full object-cover"/>' : '') + '</div><div><p class="text-sm font-bold text-on-surface dark:text-white">' + esc(i.name || '') + '</p><p class="text-xs text-on-surface-variant dark:text-white/70">Qty: ' + (i.quantity || 1) + '</p></div></div><span class="text-sm font-bold text-primary dark:text-white">' + formatKd(i.price * (i.quantity || 1), i.currency) + '</span></div>';
    }).join('');
    html += '<div class="flex justify-between py-3 text-sm text-on-surface-variant dark:text-white/70"><span>Subtotal</span><span class="font-medium text-primary dark:text-white">' + formatKd(subtotal) + '</span></div>';
    html += '<div class="flex justify-between py-3 text-sm text-on-surface-variant dark:text-white/70"><span>Shipping</span><span class="font-medium text-primary dark:text-white">' + (shipping === 0 ? "Free" : formatKd(shipping)) + '</span></div>';
    html += '<div class="flex justify-between py-4 text-lg font-extrabold"><span class="text-on-surface dark:text-white">Estimated Total</span><span class="text-primary dark:text-white">' + formatKd(total) + '</span></div>';
    /* Payment method — this phase is Cash on Delivery only (no online
       payment processing; cash is collected on delivery). Identified
       clearly here so the customer sees it before placing the order. */
    html += '<div class="flex justify-between items-center py-3 border-t border-outline-variant/20 text-sm"><span class="text-on-surface-variant dark:text-white/70">Payment Method</span><span class="font-bold text-primary dark:text-white flex items-center gap-1.5"><span class="material-symbols-outlined text-base text-secondary">payments</span>Cash on Delivery</span></div>';
    html += '<p class="text-xs text-on-surface-variant/60 dark:text-white/40 mt-2">Final invoice is generated by our POS system. Total may vary based on actual delivered items.</p>';
    summaryEl.innerHTML = html;
  }

  function init() {
    var items = getCart();
    var subtotal = items.reduce(function (s, i) { return s + (i.price * (i.quantity || 1)); }, 0);

    // Redirect to cart if empty
    if (items.length === 0) {
      var main = document.querySelector("main");
      if (main) {
        main.innerHTML = '<div class="pt-32 pb-20 text-center max-w-md mx-auto"><div class="w-20 h-20 bg-surface-container dark:bg-surface-container-high rounded-full flex items-center justify-center mx-auto mb-6"><span class="material-symbols-outlined text-5xl text-on-surface-variant dark:text-white/70">shopping_cart</span></div><h1 class="font-headline text-2xl font-extrabold text-primary dark:text-white mb-4">Your cart is empty</h1><p class="text-on-surface-variant dark:text-white/70 mb-8">Add products before checking out.</p><a href="home.html" class="inline-block bg-primary text-on-primary px-8 py-4 font-headline text-xs font-black uppercase tracking-[0.2em] rounded-sm hover:bg-secondary transition-all">Continue Shopping</a></div>';
      }
      return;
    }

    renderSummary();

    // Auto-populate form if logged in
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success && data.data && data.data.user) {
          var u = data.data.user;
          var banner = document.getElementById("logged-in-banner");
          if (banner) banner.classList.remove("hidden");
          var nameEl = document.getElementById("cust-name"); if (nameEl && !nameEl.value) nameEl.value = u.name || "";
          var phoneEl = document.getElementById("cust-phone"); if (phoneEl && !phoneEl.value) phoneEl.value = u.phone || "";
          var emailEl = document.getElementById("cust-email"); if (emailEl && !emailEl.value) emailEl.value = u.email || "";
          // Try to load default address
          fetch("/api/addresses", { credentials: "same-origin" })
            .then(function (r) { return r.json(); })
            .then(function (d) {
              if (d.success && d.data && d.data.addresses && d.data.addresses.length > 0) {
                var addr = d.data.addresses.find(function (a) { return a.isDefault; }) || d.data.addresses[0];
                populateAddressFields(addr);
              }
            })
            .catch(function () {});
        }
      })
      .catch(function () {});

    // Handle form submit
    var form = document.getElementById("checkout-form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (submitting) return; // Prevent double submission
        submitting = true;

        var btn = document.getElementById("place-order-btn");
        var btnText = btn ? btn.textContent : "";
        if (btn) { btn.textContent = "Placing Order…"; btn.disabled = true; btn.classList.add("opacity-60", "cursor-not-allowed"); }

        // Validate required fields
        var name = (document.getElementById("cust-name") || {}).value || "";
        var phone = (document.getElementById("cust-phone") || {}).value || "";
        var area = (document.getElementById("cust-area") || {}).value || "";
        var block = (document.getElementById("cust-block") || {}).value || "";
        var street = (document.getElementById("cust-street") || {}).value || "";

        var email = (((document.getElementById("cust-email") || {}).value || "").trim());
        // Kuwait phone numbers are 8 local digits, optionally +965/965 prefixed.
        var phoneDigits = phone.replace(/[\s\-()]/g, "");
        var phoneOk = /^(\+?965)?\d{8}$/.test(phoneDigits);
        var phoneNormalized = /^965\d{8}$/.test(phoneDigits) ? "+" + phoneDigits : phoneDigits;
        var emailOk = !email || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

        if (name.trim().length < 2) { showError("Please enter your full name.", document.getElementById("cust-name")); resetBtn(); return; }
        if (!phoneOk) { showError("Please enter a valid Kuwaiti phone number — 8 digits, e.g. 5512 3456, or +965 5512 3456.", document.getElementById("cust-phone")); resetBtn(); return; }
        if (!emailOk) { showError("Please enter a valid email address, or leave it empty.", document.getElementById("cust-email")); resetBtn(); return; }
        if (!area) { showError("Please fill in your Area (for example, Hawally).", document.getElementById("cust-area")); resetBtn(); return; }
        if (!block) { showError("Please fill in your Block number.", document.getElementById("cust-block")); resetBtn(); return; }
        if (!street) { showError("Please fill in your Street.", document.getElementById("cust-street")); resetBtn(); return; }
        if (items.length === 0) { showError("Your cart is empty."); resetBtn(); return; }

        var address = buildAddress();
        if (address.length < 3) { showError("Please provide delivery address details."); resetBtn(); return; }

        var body = {
          customerName: name,
          customerEmail: (document.getElementById("cust-email") || {}).value || "",
          customerPhone: phoneNormalized,
          address: address,
          city: area || "Kuwait",
          notes: (document.getElementById("cust-notes") || {}).value || "",
          items: items.map(function (i) { return { slug: i.id || i.slug, name: i.name, image: (i.image || ""), price: i.price, qty: i.quantity || 1 }; }),
          currency: "KD",
        };
        // NOTE: no `shipping` in the payload — the server computes the fee and
        // never trusts a client-sent financial value.

        var idemKey = getIdempotencyKey();
        var headers = { "Content-Type": "application/json" };
        if (idemKey) headers["x-idempotency-key"] = idemKey;

        fetch("/api/orders", { method: "POST", headers: headers, credentials: "same-origin", body: JSON.stringify(body) })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (!data.success || data.error) {
              showError(data.error || "Could not place order. Please try again.");
              resetBtn();
              return;
            }
            // Optionally save address
            var saveAddr = document.getElementById("save-address");
            if (saveAddr && saveAddr.checked) {
              fetch("/api/addresses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({
                  label: "Checkout Address",
                  fullName: name,
                  phone: phone,
                  address: address,
                  city: area || "Kuwait",
                  area: area,
                  isDefault: true,
                })
              })
              .then(function (res) { return res.json().catch(function () { return { success: false }; }); })
              .then(function (j) {
                if (!j || !j.success) {
                  // The ORDER succeeded — only the convenience of saving the
                  // address failed. Tell the customer without alarming them.
                  var note = document.createElement("p");
                  note.className = "text-xs text-amber-600 mt-2";
                  note.textContent = "Note: we could not save this address to your account, but your order was placed successfully.";
                  var trackLink = document.querySelector('main a[href^="order-detail"]');
                  if (trackLink && trackLink.parentElement) trackLink.parentElement.insertBefore(note, trackLink);
                }
              })
              .catch(function () {});
            }
            // Clear cart
            try { localStorage.setItem(CART_KEY, JSON.stringify({ state: { items: [] } })); } catch (e) {}
            // Update cart badge globally
            if (window.NassimCartBadge) window.NassimCartBadge.update();
            // The order is committed — a future checkout must get a fresh idempotency key.
            clearIdempotencyKey();
            // Take the customer DIRECTLY to the Order Sent page (rendered by
            // the existing order page) — no intermediate confirmation screen
            // and no tracking step. New guest orders use the signed short
            // public link (/o/{id}-{signature}); the access token is never
            // placed in the customer-visible URL.
            // TEMP: routed to the new cart-styled Order Sent page
            // (order-send-modified.html). Previous destination (order-detail.html
            // via shortPath / number+token / id) is kept below for easy restore.
            var sentTarget = "order-send-modified.html?number=" + encodeURIComponent(data.data.order.orderNumber) + (data.data.order.accessToken ? "&token=" + encodeURIComponent(data.data.order.accessToken) : "");
            /* var sentTarget = data.data.order.shortPath
              ? data.data.order.shortPath
              : data.data.order.accessToken
                ? "order-detail.html?number=" + encodeURIComponent(data.data.order.orderNumber) + "&token=" + encodeURIComponent(data.data.order.accessToken)
                : "order-detail.html?id=" + encodeURIComponent(data.data.order.id); */
            window.location.href = sentTarget;
          })
          .catch(function () {
            showError("Network error. Please check your connection and try again.");
            resetBtn();
          });

        function resetBtn() { submitting = false; if (btn) { btn.textContent = btnText; btn.disabled = false; btn.classList.remove("opacity-60", "cursor-not-allowed"); } }
        function showError(msg, fieldEl) {
          var errEl = document.getElementById("checkout-error");
          if (errEl) {
            errEl.textContent = msg;
            errEl.classList.remove("hidden");
            try { errEl.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
          } else { showToastFallback(msg, "error"); }
          if (fieldEl) {
            fieldEl.classList.add("ring-2", "ring-red-500", "border-red-500");
            try { fieldEl.focus(); } catch (e2) {}
            fieldEl.addEventListener("input", function clearMark() {
              fieldEl.classList.remove("ring-2", "ring-red-500", "border-red-500");
              fieldEl.removeEventListener("input", clearMark);
            });
          }
        }
        // Fallback notification when the #checkout-error banner is absent:
        // a self-contained, auto-dismissing toast (inline styles — never a
        // native alert(), whose dialog text exposes the server host).
        function showToastFallback(msg, type) {
          var existing = document.getElementById("checkout-toast-fallback");
          if (existing) existing.remove();
          var toast = document.createElement("div");
          toast.id = "checkout-toast-fallback";
          toast.setAttribute("role", type === "error" ? "alert" : "status");
          toast.textContent = msg;
          toast.style.cssText =
            "position:fixed;top:1.25rem;left:50%;transform:translateX(-50%);z-index:120;" +
            "max-width:min(92vw,26rem);background:#111d27;color:#fff;border:1px solid rgba(248,113,113,.4);" +
            "padding:.75rem 1rem;border-radius:.75rem;font-size:.8125rem;line-height:1.45;font-weight:500;" +
            "box-shadow:0 12px 40px rgba(0,3,8,.25);transition:opacity .35s ease;";
          document.body.appendChild(toast);
          setTimeout(function () {
            toast.style.opacity = "0";
            setTimeout(function () { if (toast.parentNode) toast.remove(); }, 380);
          }, 6500);
        }
      });
    }
  }

  function populateAddressFields(addr) {
    function set(id, val) { var el = document.getElementById(id); if (el && val) el.value = val; }
    set("cust-area", addr.area || addr.city || "");
    set("cust-block", addr.block || "");
    set("cust-street", addr.street || "");
    set("cust-building", addr.building || "");
    set("cust-floor", addr.floor || "");
    set("cust-apartment", addr.apartment || "");
    set("cust-landmark", addr.landmark || "");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
