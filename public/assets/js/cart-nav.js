/**
 * AL-NASSIM Cart Navigation + Global Badge Sync (Sprint 5)
 * ============================================================================
 * - Wires the cart icon in the header to navigate to cart.html.
 * - Provides a single source of truth for the cart badge count.
 * - Exposes window.NassimCartBadge.update() for any script to call after
 *   modifying the cart (add, remove, quantity change, merge, checkout).
 * - On page load, reads the cart from localStorage (guest) or /api/cart
 *   (logged in) and sets the badge.
 * - Listens to the 'storage' event for cross-tab synchronisation.
 *
 * Include on every page: <script src="assets/js/cart-nav.js"></script>
 * ============================================================================
 */
(function () {
  "use strict";

  var CART_KEY = "nassim_cart";

  function readLocalCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      if (!raw) return [];
      var p = JSON.parse(raw);
      var state = p && p.state ? p.state : p;
      return state && state.items ? state.items : [];
    } catch (e) {
      return [];
    }
  }

  function countItems(items) {
    return items.reduce(function (sum, item) {
      return sum + (item.quantity || 1);
    }, 0);
  }

  function setBadge(count) {
    // Desktop header badges (.nassim-cart-badge) and the mobile bottom-nav
    // badge (#header-cart-count) are kept in sync together; visibility is
    // driven here so the desktop badge needs no per-page wiring.
    var badges = document.querySelectorAll(".nassim-cart-badge, #header-cart-count");
    var text = String(count).padStart(2, "0");
    badges.forEach(function (el) {
      el.textContent = text;
      el.style.display = count > 0 ? "flex" : "none";
    });
  }

  var CartBadge = {
    /**
     * Re-reads the cart and updates the badge. Call this after ANY cart
     * mutation: add, remove, quantity update, checkout, login, logout, merge.
     */
    update: function () {
      // First check localStorage (guest cart)
      var localItems = readLocalCart();
      var localCount = countItems(localItems);

      // If the user is logged in, try the server cart for the authoritative count
      fetch("/api/auth/me", { credentials: "same-origin" })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.success && data.data && data.data.user && !data.data.guest) {
            // Logged in — read server cart
            fetch("/api/cart", { credentials: "same-origin" })
              .then(function (r) { return r.json(); })
              .then(function (cartData) {
                if (cartData.success && cartData.data && cartData.data.items) {
                  setBadge(countItems(cartData.data.items));
                } else {
                  setBadge(localCount);
                }
              })
              .catch(function () { setBadge(localCount); });
          } else {
            // Guest — use localStorage
            setBadge(localCount);
          }
        })
        .catch(function () { setBadge(localCount); });
    }
  };

  function init() {
    // Wire cart icon click
    var buttons = document.querySelectorAll("header button, nav button, header a, nav a");
    for (var i = 0; i < buttons.length; i++) {
      var icon = buttons[i].querySelector(".material-symbols-outlined");
      if (icon && icon.textContent.trim() === "shopping_cart") {
        var btn = buttons[i];
        if (btn.dataset.cartWired) continue;
        btn.dataset.cartWired = "1";
        btn.style.cursor = "pointer";
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          window.location.href = "cart.html";
        });
        break;
      }
    }

    // Initial badge update
    CartBadge.update();

    // Cross-tab synchronisation
    window.addEventListener("storage", function (e) {
      if (e.key === CART_KEY) {
        CartBadge.update();
      }
    });

    // Update badge when returning to the page (back/forward navigation)
    window.addEventListener("pageshow", function () {
      CartBadge.update();
    });
  }

  // Expose globally so other scripts can call NassimCartBadge.update()
  window.NassimCartBadge = CartBadge;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
