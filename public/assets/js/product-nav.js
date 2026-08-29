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
    ".accordion-content button, .dropdown-trigger, .nassim-dropdown-trigger, " +
    "[data-yml-atc], .yml-atc";

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

  /* ---- Catalog loading ---------------------------------------------------
     The static fake-catalog fallback (assets/js/products.js) is REMOVED: if
     the catalog API fails, listing pages must show a real error with a Retry
     option — never demo products at made-up prices. Loading is retried
     automatically twice; after that the error state offers a manual retry
     (unlimited). Every listing page renders its #product-grid with
     innerHTML, so injecting this state into the grid is always overwritten
     by a later successful render. Pages without a #product-grid can listen
     for the "nassim:catalog-error" event / NASSIM_CATALOG_FAILED flag. */
  var catalogAttempts = 0;
  var CATALOG_MAX_ATTEMPTS = 3; // initial load + 2 automatic retries
  var catalogWatchdog = null;

  function injectCatalogStateStyles() {
    if (document.getElementById("nassim-catalog-state-styles")) return;
    var st = document.createElement("style");
    st.id = "nassim-catalog-state-styles";
    st.textContent =
      ".nassim-catalog-error{grid-column:1/-1;text-align:center;padding:3.5rem 1rem;font-family:Inter,Arial,sans-serif}" +
      ".nassim-catalog-error h3{font-size:1.05rem;font-weight:700;margin:0 0 .4rem;color:#111d27}" +
      ".nassim-catalog-error p{font-size:.85rem;margin:0 0 1.2rem;color:#44474b}" +
      "html.dark .nassim-catalog-error h3{color:#e8f1ff}html.dark .nassim-catalog-error p{color:#bcc8d7}" +
      ".nassim-catalog-retry{display:inline-block;background:#000308;color:#fff;border:0;border-radius:.5rem;padding:.6rem 1.6rem;font-size:.8rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}" +
      "html.dark .nassim-catalog-retry{background:#f7f9ff;color:#000308}" +
      ".nassim-catalog-skel{min-height:220px;border-radius:.75rem;background:#e8eefb;animation:nassimSkelPulse 1.2s ease-in-out infinite}" +
      "html.dark .nassim-catalog-skel{background:#1a2230}" +
      ".nassim-catalog-skel:nth-child(2){animation-delay:.15s}.nassim-catalog-skel:nth-child(3){animation-delay:.3s}" +
      ".nassim-catalog-skel:nth-child(4){animation-delay:.45s}.nassim-catalog-skel:nth-child(5){animation-delay:.6s}" +
      ".nassim-catalog-skel:nth-child(6){animation-delay:.75s}.nassim-catalog-skel:nth-child(7){animation-delay:.9s}" +
      "@keyframes nassimSkelPulse{0%,100%{opacity:1}50%{opacity:.45}}" +
      "@media (prefers-reduced-motion: reduce){.nassim-catalog-skel{animation:none;opacity:.6}}";
    document.head.appendChild(st);
  }

  /** Placeholder cards while the catalogue loads. No-ops unless the page's
   *  #product-grid exists and is still empty — a later successful render
   *  (pages always use innerHTML) or the error state replaces them. */
  function showCatalogSkeleton() {
    injectCatalogStateStyles();
    var g = document.getElementById("product-grid");
    if (!g || g.children.length) return;
    var cards = "";
    for (var i = 0; i < 8; i++) cards += '<div class="nassim-catalog-skel" aria-hidden="true"></div>';
    g.innerHTML = cards;
  }

  function showCatalogError() {
    injectCatalogStateStyles();
    window.NASSIM_CATALOG_FAILED = true;
    var g = document.getElementById("product-grid");
    if (g) {
      g.innerHTML =
        '<div class="nassim-catalog-error" role="alert">' +
        "<h3>Couldn&#8217;t load products</h3>" +
        "<p>We couldn&#8217;t reach the catalogue. Check your connection and try again.</p>" +
        '<button type="button" class="nassim-catalog-retry" data-catalog-retry>Retry</button>' +
        "</div>";
    }
    try { document.dispatchEvent(new CustomEvent("nassim:catalog-error")); } catch (e) { /* older engines */ }
  }

  function loadCatalog(bust) {
    if (window.NASSIM_PRODUCTS) { init(); return; }
    window.NASSIM_CATALOG_FAILED = false;
    showCatalogSkeleton();
    function catalogFailed() {
      clearTimeout(catalogWatchdog);
      script.onload = script.onerror = null;
      catalogAttempts++;
      if (catalogAttempts < CATALOG_MAX_ATTEMPTS) {
        loadCatalog(true);
      } else {
        showCatalogError();
      }
    }
    var script = document.createElement("script");
    script.src = "/api/catalog" + (bust ? "?retry=" + Date.now() : "");
    script.onload = function () {
      clearTimeout(catalogWatchdog);
      if (window.NASSIM_PRODUCTS) init();
      else catalogFailed(); // executed without producing a catalog — treat as failure
    };
    script.onerror = catalogFailed;
    // Network-hang watchdog: a request that never settles must not hang the store.
    clearTimeout(catalogWatchdog);
    catalogWatchdog = setTimeout(function () {
      if (!window.NASSIM_PRODUCTS) catalogFailed();
    }, 12000);
    document.head.appendChild(script);
  }

  // Manual retry (unlimited): fresh attempt budget, fresh script.
  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-catalog-retry]") : null;
    if (!btn) return;
    e.preventDefault();
    catalogAttempts = 0;
    var g = document.getElementById("product-grid");
    if (g) g.innerHTML = "";
    loadCatalog(true);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadCatalog);
  } else {
    loadCatalog();
  }

  // ---- bfcache (Back/Forward Cache) restore handling ----
  // When the user navigates to a product and presses Back, mobile browsers
  // restore this page from the bfcache WITHOUT re-running the script. The
  // _navigating flag set at navigation time (goToProduct) survives the restore
  // as `true`, which would make the delegated click handler (above) return early
  // for every tap — so no product could be re-opened after returning. `pageshow`
  // fires on BOTH normal loads and bfcache restores; when `event.persisted` is
  // true the reset is mandatory (and harmless on a normal load otherwise).
  window.addEventListener("pageshow", function (e) {
    _navigating = false;
  });
})();
