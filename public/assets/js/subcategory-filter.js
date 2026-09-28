/**
 * AL-NASSIM Subcategory Filter
 * ============================================================================
 * Connects the subcategory filter buttons (already present in the page HTML)
 * to real database-driven filtering. Uses the Product → subcategoryId →
 * Subcategory relationship exposed via /api/catalog as `subcategorySlug`.
 *
 * HOW IT WORKS:
 *   1. Waits for NASSIM_PRODUCTS (the catalog blob loaded by each page).
 *   2. Builds a slug→subcategorySlug lookup from the catalog.
 *   3. Watches the product grid (MutationObserver) — whenever cards are
 *      rendered/re-rendered (by the page's own sort/price/color filters),
 *      stamps each card with data-subcategory="<slug>" using the card's
 *      data-slug (product slug) → catalog → subcategorySlug.
 *   4. Wires .category-btn / .subcat-cat-chip clicks:
 *        "All …" button → show all cards in the category
 *        named button   → show only cards whose subcategorySlug matches
 *   5. Re-applies the active filter after each re-render.
 *
 * NO NAME-BASED GUESSING: card → data-slug → catalog entry.subcategorySlug
 * (the actual DB relation). Future products automatically appear under the
 * correct filters when assigned through the admin panel.
 *
 * NON-INVASIVE: doesn't modify any page's inline script. Works alongside
 * the existing sort/price/color filter pipeline — those re-render cards,
 * and this re-stamps + re-filters them.
 * ============================================================================
 */
(function () {
  "use strict";

  var activeSubcategory = null; // null = All, or a subcategory slug
  var slugToSubcat = {};        // product slug → subcategorySlug (or null)
  var subcatSlugByName = {};    // subcategory display name → slug

  function buildLookups() {
    if (!window.NASSIM_PRODUCTS) return false;
    for (var i = 0; i < window.NASSIM_PRODUCTS.length; i++) {
      var p = window.NASSIM_PRODUCTS[i];
      slugToSubcat[p.id] = p.subcategorySlug || null;
      // Build name→slug map from the catalog (for button-text matching).
      // We can't get the name from the catalog entry directly (only slug),
      // so we collect the mapping from the page's button labels + the
      // products that have this subcategory.
    }
    // Build the name→slug map from the page's own filter buttons:
    // each button with a non-"All" label corresponds to a subcategory.
    // We match by checking which catalog products have a non-null
    // subcategorySlug and cross-referencing with the page's CATEGORY.
    var btns = document.querySelectorAll(".subcat-tabs .category-btn, .subcat-cat-chip");
    var names = [];
    btns.forEach(function (b) {
      var text = b.textContent.replace(/check$/, "").trim();
      if (text && !/^All\b/i.test(text)) names.push(text);
    });
    // For each button name, find the matching subcategory slug by checking
    // the admin hierarchy API data baked into the catalog. Since we only
    // have subcategorySlug (not name) in the catalog, we use a slugify
    // approach: button "Cutlery & Cleaver" → "cutlery-cleaver".
    names.forEach(function (name) {
      // Must match the server-side slugify (lib slugify): lowercase,
      // non-alphanumeric → dash, collapse consecutive dashes.
      var slug = name.toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      subcatSlugByName[name] = slug;
    });
    return true;
  }

  /** Stamp all cards in the grid with data-subcategory from the catalog. */
  function stampCards() {
    var grid = document.getElementById("product-grid");
    if (!grid) return;
    var cards = grid.querySelectorAll("article[data-slug], [data-product-id]");
    cards.forEach(function (card) {
      var slug = card.getAttribute("data-slug") || card.getAttribute("data-product-id");
      if (!slug) return;
      var subcat = slugToSubcat[slug];
      card.setAttribute("data-subcategory", subcat || "");
    });
  }

  /** Apply the active subcategory filter (show/hide cards). */
  function applyFilter() {
    var grid = document.getElementById("product-grid");
    if (!grid) return;
    var cards = grid.querySelectorAll("article[data-slug], [data-product-id]");
    var visible = 0;
    cards.forEach(function (card) {
      var subcat = card.getAttribute("data-subcategory") || "";
      var show = !activeSubcategory || subcat === activeSubcategory;
      card.style.display = show ? "" : "none";
      if (show) visible++;
    });
    // Update the product count display
    var countEl = document.getElementById("catalog-count") || document.querySelector("[data-lh-count]");
    if (countEl) {
      countEl.textContent = "number of items: " + visible;
    }
    // Show a friendly empty state if the filter yields zero results
    var existing = grid.querySelector(".subcat-empty-state");
    if (visible === 0 && activeSubcategory) {
      if (!existing) {
        var empty = document.createElement("div");
        empty.className = "subcat-empty-state col-span-full text-center py-20";
        empty.innerHTML =
          '<span class="material-symbols-outlined text-5xl text-outline-variant/40 block mb-4">category</span>' +
          '<p class="text-lg text-on-surface-variant dark:text-white/70">No products in this subcategory yet.</p>' +
          '<p class="text-sm text-on-surface-variant/60 dark:text-white/40 mt-2">Check back soon or browse all products.</p>';
        grid.appendChild(empty);
      }
    } else if (existing) {
      existing.remove();
    }
  }

  /** Update active state on all filter buttons (desktop + mobile). */
  function updateActiveStates(clickedBtn) {
    var all = document.querySelectorAll(".category-btn, .subcat-cat-chip");
    all.forEach(function (b) {
      var text = b.textContent.replace(/check$/, "").trim();
      var isAll = /^All\b/i.test(text);
      var isActive = activeSubcategory === null ? isAll : (b === clickedBtn);
      b.classList.toggle("is-active", isActive);
      // Also toggle a generic CSS class for styling hooks
      b.classList.toggle("active-subcat", isActive);
    });
  }

  /** Wire all filter buttons. */
  function wireButtons() {
    var btns = document.querySelectorAll(".subcat-tabs .category-btn, .subcat-cat-chip");
    btns.forEach(function (btn) {
      if (btn.dataset.subcatWired) return;
      btn.dataset.subcatWired = "1";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var text = btn.textContent.replace(/check$/, "").trim();
        if (/^All\b/i.test(text)) {
          activeSubcategory = null;
        } else {
          activeSubcategory = subcatSlugByName[text] || null;
        }
        updateActiveStates(btn);
        stampCards();
        applyFilter();
      });
    });
  }

  /** Full refresh: stamp + filter (called after grid re-renders). */
  function refresh() {
    stampCards();
    applyFilter();
  }

  function init() {
    if (!buildLookups()) {
      setTimeout(init, 150);
      return;
    }
    // Watch for grid re-renders (the page's own filters re-render cards).
    // Use BOTH a MutationObserver and a polling interval — the page's own
    // renderProducts() may fire asynchronously after our initial filter,
    // and the observer alone can miss rapid re-renders.
    var grid = document.getElementById("product-grid");
    if (grid && window.MutationObserver) {
      var observer = new MutationObserver(function () {
        clearTimeout(observer._t);
        observer._t = setTimeout(refresh, 30);
      });
      observer.observe(grid, { childList: true, subtree: false });
    }
    // Safety net: re-apply every 200ms when a subcategory filter is active.
    // Cheap (a few attribute reads) and guarantees the filter survives
    // any page re-render (sort, price, color changes, etc).
    setInterval(function () {
      if (activeSubcategory) refresh();
    }, 200);
    // Wire buttons (both the hidden source and any already-cloned chips)
    wireButtons();
    // Also watch for the mobile drawer cloning buttons later
    if (window.MutationObserver) {
      var drawerObs = new MutationObserver(function () {
        wireButtons();
      });
      var sidebar = document.querySelector(".subcat-sidebar");
      if (sidebar) drawerObs.observe(sidebar, { childList: true, subtree: true });
    }
    // Initial stamp + apply (after the page's own loadAndRender finishes)
    setTimeout(refresh, 300);
    // Expose for testing
    window.NassimSubcategoryFilter = {
      refresh: refresh,
      setSubcategory: function (slug) { activeSubcategory = slug; refresh(); },
      clearSubcategory: function () { activeSubcategory = null; refresh(); },
      getActive: function () { return activeSubcategory; },
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
