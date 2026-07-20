/**
 * AL-NASSIM Product Navigation
 * ============================================================================
 * Makes product cards clickable across the site. Clicking a product navigates
 * to the Product View page (?id=slug).
 *
 * IMPORTANT: Category links (<a href="category.html">) are NOT intercepted —
 * they navigate to the category listing page normally. Only elements with
 * data-product-id, data-slug, or data-item-id (actual product cards) trigger
 * product navigation.
 *
 * Slug resolution:
 *   1. data-product-id  2. data-slug  3. data-item-id
 *   4. Child [data-product-id] / [data-slug] / [data-item-id]
 *   5. Match product name (h3/h4) against the catalog
 *   6. Match image src against the catalog
 *
 * Include on every page: <script src="assets/js/product-nav.js"></script>
 * ============================================================================
 */
(function () {
  "use strict";

  var _navigating = false;
  function goToProduct(slug) {
    if (_navigating) return;
    _navigating = true;
    var url = "product%20view.html";
    if (slug) url += "?id=" + encodeURIComponent(slug);
    window.location.href = url;
  }

  function getSlug(card) {
    if (!card) return "";
    if (card.dataset && card.dataset.productId) return card.dataset.productId;
    if (card.dataset && card.dataset.slug) return card.dataset.slug;
    if (card.dataset && card.dataset.itemId) return card.dataset.itemId;
    var child = card.querySelector("[data-product-id], [data-slug], [data-item-id]");
    if (child) return child.dataset.productId || child.dataset.slug || child.dataset.itemId || "";
    var nameEl = card.querySelector("h3, h4, .product-name");
    if (nameEl && window.NASSIM_PRODUCTS) {
      var name = nameEl.textContent.trim().toLowerCase();
      for (var i = 0; i < window.NASSIM_PRODUCTS.length; i++) {
        if (window.NASSIM_PRODUCTS[i].name.toLowerCase() === name) return window.NASSIM_PRODUCTS[i].id;
      }
    }
    var imgEl = card.querySelector("img[src]");
    if (imgEl && window.NASSIM_PRODUCTS) {
      var src = imgEl.getAttribute("src");
      for (var j = 0; j < window.NASSIM_PRODUCTS.length; j++) {
        if (window.NASSIM_PRODUCTS[j].img === src || window.NASSIM_PRODUCTS[j].image === src) return window.NASSIM_PRODUCTS[j].id;
        var images = window.NASSIM_PRODUCTS[j].images || [];
        for (var k = 0; k < images.length; k++) { if (images[k] === src) return window.NASSIM_PRODUCTS[j].id; }
      }
    }
    return "";
  }

  /** Elements that should NOT trigger product navigation. */
  var SKIP_SELECTOR =
    "[data-product-wired], .quantity-btn-minus, .quantity-btn-plus, " +
    ".remove-btn, .wishlist-btn, .qv-qty-minus, .qv-qty-plus, " +
    "#theme-toggle, #account-btn, #download-btn, button[id], " +
    ".accordion-content button, .dropdown-trigger, .nassim-dropdown-trigger";

  /** Selector for actual PRODUCT cards (NOT category showcases). */
  var PRODUCT_CARD_SELECTOR =
    "[data-product-id], [data-slug], [data-item-id], " +
    ".product-card, .cart-item, .wishlist-card, " +
    "article.group";

  function init() {
    // 1. Wire "View Product" buttons explicitly
    var buttons = document.querySelectorAll("button, a");
    for (var i = 0; i < buttons.length; i++) {
      var text = (buttons[i].textContent || "").trim();
      // Use includes() instead of exact match — text may contain icon names
      if (text.includes("View Product") || text.includes("View Products") || text.includes("View Details") ||
          text.includes("View Kitchenware") || text.includes("View Cleaning Products") ||
          text.includes("View Freezer") || text.includes("View Trollies") ||
          text.includes("Quick View")) {
        var btn = buttons[i];
        if (btn.dataset.productWired) continue;
        btn.dataset.productWired = "1";
        btn.style.cursor = "pointer";
        (function (el) {
          el.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            var card = el.closest(PRODUCT_CARD_SELECTOR);
            var slug = card ? getSlug(card) : (el.dataset.productId || "");
            goToProduct(slug);
          });
        })(btn);
      }
    }

    // 2. Add cursor:pointer to product images and names
    var productEls = document.querySelectorAll(
      PRODUCT_CARD_SELECTOR + " img, " + PRODUCT_CARD_SELECTOR + " h3, " + PRODUCT_CARD_SELECTOR + " h4"
    );
    for (var k = 0; k < productEls.length; k++) productEls[k].style.cursor = "pointer";

    // 3. Event delegation for product cards (including JS-rendered ones)
    document.addEventListener("click", function (e) {
      if (_navigating) return;

      // Skip functional buttons
      if (e.target.closest(SKIP_SELECTOR)) return;

      // CRITICAL: If the click is on an <a> tag with an href to a .html page,
      // let it navigate normally (this is a category link, not a product link).
      var anchor = e.target.closest("a[href]");
      if (anchor) {
        var href = anchor.getAttribute("href");
        // If the href points to a .html page (category navigation), don't intercept
        if (href && href.match(/\.html/) && href.indexOf("product") === -1) {
          return; // let the browser handle the category page navigation
        }
        // If the href already points to a product view page, let it work natively
        if (href && href.indexOf("product") > -1) {
          return;
        }
      }

      // Find the closest PRODUCT card (not a category showcase)
      var card = e.target.closest(PRODUCT_CARD_SELECTOR);
      if (card) {
        // Double-check: if this card is inside an <a href="*.html"> (category link),
        // don't intercept — let the category link work.
        var catLink = card.closest('a[href$=".html"]');
        if (catLink && catLink.getAttribute("href").indexOf("product") === -1) {
          return; // category page link — let it navigate normally
        }

        var slug = getSlug(card);
        if (slug) {
          e.preventDefault();
          e.stopPropagation();
          goToProduct(slug);
        }
      }
    });
  }

  function loadCatalog() {
    if (window.NASSIM_PRODUCTS) { init(); return; }
    var script = document.createElement("script");
    script.src = "/api/catalog";
    script.onload = init;
    script.onerror = function () {
      var fallback = document.createElement("script");
      fallback.src = "assets/js/products.js";
      fallback.onload = init;
      fallback.onerror = init;
      document.head.appendChild(fallback);
    };
    document.head.appendChild(script);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadCatalog);
  } else {
    loadCatalog();
  }
})();
