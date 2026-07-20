/**
 * AL-NASSIM Checkout Logic
 * Reads cart from localStorage, populates checkout summary, submits order to /api/orders.
 */
(function () {
  "use strict";
  var CART_KEY = "nassim_cart";
  function readStore(key) { try { var raw = localStorage.getItem(key); if (!raw) return null; var p = JSON.parse(raw); return p && p.state ? p.state : p; } catch (e) { return null; } }
  function getCart() { var s = readStore(CART_KEY); return s && s.items ? s.items : []; }
  function formatKd(v, c) { return (c || "KD") + " " + Number(v).toFixed(3); }

  function init() {
    var items = getCart();
    var shipping = 2.5;
    var subtotal = items.reduce(function(s, i) { return s + (i.price * (i.quantity || 1)); }, 0);
    var total = subtotal + shipping;

    // Populate summary
    var summaryEl = document.getElementById("checkout-summary");
    if (summaryEl) {
      var html = items.map(function(i) {
        return '<div class="flex justify-between items-center py-3 border-b border-outline-variant/20"><div class="flex items-center gap-3"><div class="w-12 h-12 bg-surface-container rounded-lg overflow-hidden flex-shrink-0">' + (i.image ? '<img src="' + i.image + '" alt="" class="w-full h-full object-cover"/>' : '') + '</div><div><p class="text-sm font-bold text-on-surface dark:text-white">' + (i.name||'') + '</p><p class="text-xs text-on-surface-variant dark:text-white/70">Qty: ' + (i.quantity||1) + '</p></div></div><span class="text-sm font-bold text-primary dark:text-white">' + formatKd(i.price * (i.quantity||1), i.currency) + '</span></div>';
      }).join('');
      html += '<div class="flex justify-between py-3 text-sm text-on-surface-variant dark:text-white/70"><span>Subtotal</span><span class="font-medium text-primary dark:text-white">' + formatKd(subtotal) + '</span></div>';
      html += '<div class="flex justify-between py-3 text-sm text-on-surface-variant dark:text-white/70"><span>Shipping</span><span class="font-medium text-primary dark:text-white">' + formatKd(shipping) + '</span></div>';
      html += '<div class="flex justify-between py-4 text-lg font-extrabold"><span class="text-on-surface dark:text-white">Total</span><span class="text-primary dark:text-white">' + formatKd(total) + '</span></div>';
      summaryEl.innerHTML = html;
    }

    // Handle form submit
    var form = document.getElementById("checkout-form");
    if (form) {
      form.addEventListener("submit", function(e) {
        e.preventDefault();
        var btn = document.getElementById("place-order-btn");
        if (btn) { btn.textContent = "Placing Order..."; btn.disabled = true; }

        var body = {
          customerName: (document.getElementById("cust-name")||{}).value || "",
          customerEmail: (document.getElementById("cust-email")||{}).value || "",
          customerPhone: (document.getElementById("cust-phone")||{}).value || "",
          address: (document.getElementById("cust-address")||{}).value || "",
          city: (document.getElementById("cust-city")||{}).value || "",
          notes: (document.getElementById("cust-notes")||{}).value || "",
          items: items.map(function(i) { return { slug: i.id, name: i.name, image: i.image, price: i.price, qty: i.quantity || 1 }; }),
          shipping: shipping,
          currency: "KD",
        };

        fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (data.error) { alert(data.error); if (btn) { btn.textContent = "Place Order"; btn.disabled = false; } return; }
            // Clear cart
            localStorage.setItem(CART_KEY, JSON.stringify({ state: { items: [], shipping: 2.5, currency: "KD" } }));
            // Show success
            var main = document.querySelector("main");
            if (main) {
              main.innerHTML = '<div class="pt-20 pb-20 text-center max-w-md mx-auto"><div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><span class="material-symbols-outlined text-5xl text-green-600">check_circle</span></div><h1 class="font-display text-3xl font-extrabold text-primary dark:text-white mb-4">Order Placed!</h1><p class="text-on-surface-variant dark:text-white/70 mb-2">Your order number is:</p><p class="font-display text-2xl font-extrabold text-secondary mb-8">' + data.order.orderNumber + '</p><p class="text-sm text-on-surface-variant dark:text-white/70 mb-8">We will contact you shortly to confirm your order and delivery details.</p><a href="home.html" class="inline-block bg-primary text-on-primary px-8 py-4 font-headline text-xs font-black uppercase tracking-[0.2em] rounded-sm hover:bg-secondary transition-all">Continue Shopping</a></div>';
            }
          })
          .catch(function(err) { alert("Failed to place order. Please try again."); if (btn) { btn.textContent = "Place Order"; btn.disabled = false; } });
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
