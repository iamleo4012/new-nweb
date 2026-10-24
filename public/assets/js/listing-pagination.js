/**
 * AL-NASSIM Listing Pagination (dynamic)
 * ============================================================================
 * One shared controller for every category / subcategory / listing page.
 * Page numbers are generated from the ACTUAL number of product cards in
 * #product-grid after the page's own filter/sort/search logic has rendered
 * them — never hardcoded. The pagination row hides entirely when everything
 * fits on one page (or when there are no results).
 *
 * How it works with each page's existing render pipeline:
 *   - Pages render ALL filtered products into #product-grid as <article>
 *     cards (their own logic, untouched). This controller then shows only
 *     the current page's slice (display toggling — no DOM rewrites).
 *   - A MutationObserver on the grid notices whenever the page re-renders
 *     (filter change, search, price range, sort, catalogue reload) and
 *     recomputes the page count, resetting to page 1.
 *   - The catalogue-unavailable error state and the loading skeleton inject
 *     non-article elements, so the row hides itself automatically there too.
 *
 * Required markup (present on all listing pages — older static/hardcoded
 * rows were replaced by the rollout script):
 *   <button id="prev-page">…</button> <div id="page-numbers"></div>
 *   <button id="next-page">…</button>
 * The controller hides the row's wrapper container (#nassim-listing-pagination
 * or the numbers' parent) when there is at most one page.
 */
(function () {
  "use strict";

  var MIN_PER_PAGE = 20; // smallest acceptable number of products per page
  var MAX_BUTTONS = 7;  // page buttons shown before ellipsis windows kick in

  var BTN_BASE =
    "flex items-center justify-center w-10 h-10 text-[11px] font-bold transition-all rounded-sm ";
  var BTN_ACTIVE = BTN_BASE + "bg-primary dark:bg-white text-white dark:text-primary";
  var BTN_INACTIVE =
    BTN_BASE +
    "border border-outline-variant/30 dark:border-white/20 text-outline dark:text-white/70 " +
    "hover:border-secondary dark:hover:border-white hover:text-secondary dark:hover:text-white";

  function init() {
    var grid = document.getElementById("product-grid");
    var numbers = document.getElementById("page-numbers");
    var prev = document.getElementById("prev-page");
    var next = document.getElementById("next-page");
    if (!grid || !numbers || !prev || !next) return;
    if (grid.dataset.paginationBound) return;
    grid.dataset.paginationBound = "1";

    var currentPage = 1;
    /* Page requested in the URL (?page=N). Consumed once the catalogue has
       actually rendered cards (the initial refresh runs against the loading
       skeleton, where nothing can be shown yet). Invalid values fall back to
       page 1; out-of-range values are clamped to the last page in refresh(). */
    function readPageParam() {
      try {
        var v = parseInt(new URLSearchParams(window.location.search).get("page"), 10);
        return v >= 1 ? v : 1;
      } catch (e) { return 1; }
    }
    var pendingPage = readPageParam();

    /* Page size = (actual rendered grid columns) × (smallest whole row count
       that reaches MIN_PER_PAGE). Columns are read from the LIVE computed
       grid layout, so each responsive breakpoint gets its own uniform page:
       1 col → 20, 2 → 20, 3 → 21, 4 → 20, 5 → 20, 6 → 24, 7 → 21 …
       Recomputed on every refresh, so viewport changes re-slice cleanly. */
    var cachedCols = 0;
    function pageSize() {
      var cols = cachedCols;
      if (!cols) {
        try {
          var tmpl = getComputedStyle(grid).gridTemplateColumns;
          if (tmpl && tmpl.trim() && tmpl.trim() !== "none") {
            cols = tmpl.trim().split(/\s+/).length;
          }
        } catch (e) { /* older engines */ }
        if (!(cols >= 1)) cols = 1;
        cachedCols = cols;
      }
      return cols * Math.max(1, Math.ceil(MIN_PER_PAGE / cols));
    }
    /* Card count at the moment a ?page=N restore happened — lets refresh()
       tell a duplicate render of the same content apart from a real
       filter/sort change (which must reset to page 1). */
    var restoredCount = 0;

    /* Rewrite ?page=N while preserving every other query parameter
       (category path, search, filters …). push=false uses replaceState so
       programmatic resets (filter change → page 1) don't spam history. */
    function writePageParam(page, push) {
      try {
        var u = new URL(window.location.href);
        u.searchParams.set("page", String(page));
        if (push) window.history.pushState({ nassimPage: page }, "", u);
        else window.history.replaceState({ nassimPage: page }, "", u);
      } catch (e) { /* older engines: pagination still works, URL just stays */ }
    }

    function cards() {
      return Array.prototype.slice.call(grid.querySelectorAll("article"));
    }

    function rowWrapper() {
      return numbers.closest("#nassim-listing-pagination") || numbers.parentElement;
    }

    function scrollToGridTop() {
      try { grid.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) { /* older engines */ }
    }

    function renderNumbers(totalPages) {
      numbers.innerHTML = "";
      var seq = [];
      if (totalPages <= MAX_BUTTONS) {
        for (var i = 1; i <= totalPages; i++) seq.push(i);
      } else {
        seq.push(1);
        var start = Math.max(2, currentPage - 1);
        var end = Math.min(totalPages - 1, currentPage + 1);
        if (start > 2) seq.push("…");
        for (var j = start; j <= end; j++) seq.push(j);
        if (end < totalPages - 1) seq.push("…");
        seq.push(totalPages);
      }
      seq.forEach(function (n) {
        if (n === "…") {
          var ell = document.createElement("span");
          ell.textContent = "…";
          ell.className = "px-2 text-on-surface-variant dark:text-white/50 select-none";
          numbers.appendChild(ell);
          return;
        }
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = n;
        b.className = n === currentPage ? BTN_ACTIVE : BTN_INACTIVE;
        if (n === currentPage) b.setAttribute("aria-current", "page");
        b.addEventListener("click", function () {
          currentPage = n;
          writePageParam(currentPage, true);
          refresh(false);
          scrollToGridTop();
        });
        numbers.appendChild(b);
      });
    }

    function refresh(resetPage) {
      var list = cards();
      var totalPages = Math.max(1, Math.ceil(list.length / pageSize()));
      if (resetPage) {
        if (pendingPage > 1 && list.length > 0) {
          // First render after load/reload with ?page=N: restore it (clamped
          // below if the catalogue shrank). Consumed once, so later
          // filter/sort re-renders still behave as before (back to page 1).
          currentPage = pendingPage;
          pendingPage = 1;
          restoredCount = list.length;
        } else if (restoredCount && list.length === restoredCount) {
          // Duplicate observer fire after the restore (e.g. a second render
          // pass with identical content): keep the restored page instead of
          // kicking the user back to page 1.
        } else {
          currentPage = 1;
          if (list.length > 0) writePageParam(1, false);
        }
      }
      if (currentPage > totalPages) {
        // Requested page exceeds the catalogue (e.g. ?page=99): show the last
        // page and normalize the URL so a reload lands on the same place.
        currentPage = totalPages;
        writePageParam(currentPage, false);
      }

      var wrapper = rowWrapper();
      if (list.length === 0 || totalPages <= 1) {
        // Everything fits on one page (or nothing to show): no pagination UI,
        // and make sure no card is left hidden from an earlier page state.
        if (wrapper) wrapper.style.display = "none";
        list.forEach(function (a) { a.style.display = ""; });
        return;
      }

      if (wrapper) wrapper.style.display = "";
      list.forEach(function (a, idx) {
        a.style.display = Math.floor(idx / pageSize()) + 1 === currentPage ? "" : "none";
      });
      renderNumbers(totalPages);
      prev.disabled = currentPage === 1;
      next.disabled = currentPage === totalPages;
    }

    prev.addEventListener("click", function () {
      if (currentPage > 1) {
        currentPage--; writePageParam(currentPage, true);
        refresh(false); scrollToGridTop();
      }
    });
    next.addEventListener("click", function () {
      if (currentPage < Math.ceil(cards().length / pageSize())) {
        currentPage++; writePageParam(currentPage, true);
        refresh(false); scrollToGridTop();
      }
    });

    // Back / Forward: re-read ?page=N from the URL the browser navigated to
    // and show that page. pendingPage mechanism does the clamping; filters
    // are not part of the URL, so the grid content itself is untouched.
    window.addEventListener("popstate", function () {
      pendingPage = readPageParam();
      refresh(true);
      scrollToGridTop();
    });

    // Viewport changes alter the grid's column count (breakpoint change), so
    // the page size is recomputed and the page re-sliced. The current page is
    // kept and clamped inside refresh() — no reset, no refetch.
    var resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { cachedCols = 0; refresh(false); }, 200);
    });

    // Re-render detection: filter/search/sort changes and catalogue loads all
    // replace the grid's children — recompute pages (debounced). Only childList
    // matters: this controller's own display toggles never trigger it.
    var timer = null;
    var observer = new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(function () { refresh(true); }, 150);
    });
    observer.observe(grid, { childList: true, subtree: false });

    refresh(true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* ==========================================================================
 * AR product-card bidi hardening (shared, all listing pages)
 * ==========================================================================
 * Product names mix Arabic with Latin tokens — brand + product codes such as
 * "Al-nassim-ND-6724" — and prices are numeric ("0.750 KD"). Inside an RTL
 * line the Unicode bidi algorithm keeps those runs readable, but the LINE
 * BREAKER treats every hyphen/period as a break opportunity, so a code can
 * wrap mid-token ("ND-" / "6724") and the isolated pieces then reorder
 * visually per line. Fix: wrap each contiguous Latin/digit token (no spaces)
 * in an isolation span. The span is styled ONLY under html.lang-ar
 * (rtl-overrides.css): direction:ltr + unicode-bidi:isolate keeps the token
 * as one readable LTR run and white-space:nowrap keeps it on one line. In
 * English the class is inert — text and wrapping are byte-identical.
 * Idempotent (marked spans are skipped), runs on every grid re-render via
 * its own MutationObserver. No product data, ordering or filter logic is
 * touched — this only decorates rendered text nodes.
 * ========================================================================== */
(function () {
  "use strict";

  var MARK = "nassim-bidi-l";
  /* Latin/digit token: letters/digits plus intra-token punctuation
     (hyphen, period, ampersand, slash, comma, apostrophe, °, %) —
     deliberately NO spaces, so ordinary multi-word text still wraps. */
  var TOKEN = /[A-Za-z0-9][A-Za-z0-9&.,\/''\u2019-]*[A-Za-z0-9%°]|[A-Za-z0-9]/g;

  function hardenText(node) {
    var v = node.nodeValue;
    if (!v || !/[A-Za-z0-9]/.test(v)) return null;
    TOKEN.lastIndex = 0;
    if (!TOKEN.test(v)) return null;
    TOKEN.lastIndex = 0;
    var frag = document.createDocumentFragment();
    var last = 0, m;
    while ((m = TOKEN.exec(v))) {
      if (m.index > last) frag.appendChild(document.createTextNode(v.slice(last, m.index)));
      var span = document.createElement("span");
      span.className = MARK;
      span.textContent = m[0];
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (last < v.length) frag.appendChild(document.createTextNode(v.slice(last)));
    return frag;
  }

  function hardenCard(card) {
    if (card.__nassimBidiDone) return;
    card.__nassimBidiDone = true;
    var targets = card.querySelectorAll("h2, p");
    targets.forEach(function (el) {
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      var nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(function (node) {
        if (node.parentElement && node.parentElement.classList.contains(MARK)) return;
        var frag = hardenText(node);
        if (frag) node.parentNode.replaceChild(frag, node);
      });
    });
  }

  function hardenGrid() {
    var grid = document.getElementById("product-grid");
    if (!grid) return;
    grid.querySelectorAll("article.group").forEach(hardenCard);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hardenGrid);
  } else {
    hardenGrid();
  }
  window.addEventListener("load", hardenGrid);

  var t = null;
  var mo = new MutationObserver(function () {
    clearTimeout(t);
    t = setTimeout(hardenGrid, 200);
  });
  function arm() {
    var grid = document.getElementById("product-grid");
    if (grid) mo.observe(grid, { childList: true });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", arm);
  } else {
    arm();
  }
})();
