(function () {
  'use strict';

  var products = null;
  var overlay = null;
  var inputEl = null;
  var resultsEl = null;

  /* ---- Shared name matcher (PRODUCT NAME only) ----
     A query may contain several terms: whitespace is normalized, the query
     is split into individual words, and EVERY term must appear somewhere in
     the product name (order and adjacency do not matter). Case-insensitive
     for English; Arabic text is compared as-is after lowercasing (which
     leaves Arabic untouched). Exposed for the listing pages' filter
     pipeline so the top-nav search and the page filter share ONE matcher. */
  function nameMatchesQuery(name, query) {
    var nl = String(name || '').toLowerCase();
    var terms = String(query || '').trim().toLowerCase().split(/\s+/);
    if (!terms.length || terms[0] === '') return true;
    for (var i = 0; i < terms.length; i++) {
      if (nl.indexOf(terms[i]) === -1) return false;
    }
    return true;
  }
  /* Exposed for the listing pages' filter pipeline so the top-nav search
     and the page filter share ONE matcher (assigned to window.NassimSearch
     at init below). */

  /* Combination-search priority + fallback: with multiple terms, the query
     is used as-is when at least ONE product in `list` (the current page's
     scope) contains ALL terms; when NONE does, only the FIRST term is kept
     (never the second or later). Single-term queries pass through. */
  function effectiveQuery(query, list) {
    var q = String(query || '').trim();
    if (!q) return q;
    var terms = q.toLowerCase().split(/\s+/);
    if (terms.length < 2) return q;
    for (var i = 0; i < (list || []).length; i++) {
      var nl = String(((list[i] && list[i].name) || '') + ' ' + ((list[i] && list[i].nameAr) || '')).toLowerCase();
      var all = true;
      for (var j = 0; j < terms.length; j++) {
        if (nl.indexOf(terms[j]) === -1) { all = false; break; }
      }
      if (all) return q;
    }
    return terms[0];
  }

  /* ---- Product data (fetched once, cached) ----
     Fetches the FULL catalogue (API hard cap: 100 products). The previous
     default request returned only the first 24 products, so every search —
     here and in the ~34 pages that reuse NassimSearch.loadProducts — could
     never find anything beyond that first page. If the catalogue grows past
     100, switch callers to server-side ?q= queries instead. */
  function loadProducts() {
    if (products) return Promise.resolve(products);
    return fetch('/api/products?limit=100', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        products = (data && data.data) || [];
        return products;
      })
      .catch(function () {
        // Do NOT cache the failure: an API hiccup would otherwise freeze the
        // search to "No products found" until a page reload. Next search retries.
        products = null;
        return [];
      });
  }

  function productImage(p) {
    return p.img || p.image || (p.images && p.images[0]) || '';
  }

  /* ---- Result rendering (shared by overlay & inline dropdown) ---- */
  function render(list, target) {
    var el = target || resultsEl;
    if (!el) return;
    el.innerHTML = '';
    if (!list || !list.length) {
      var empty = document.createElement('p');
      empty.style.cssText = 'padding:24px;text-align:center;color:#888;font-size:14px;';
      empty.textContent = 'No products found';
      el.appendChild(empty);
      return;
    }
    list.slice(0, 20).forEach(function (p) {
      var a = document.createElement('a');
      a.href = 'product-view.html?id=' + encodeURIComponent(p.id);
      a.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 16px;text-decoration:none;color:inherit;border-bottom:1px solid rgba(0,0,0,0.06);';
      a.onmouseenter = function () { a.style.background = 'rgba(0,0,0,0.04)'; };
      a.onmouseleave = function () { a.style.background = ''; };

      var img = document.createElement('img');
      img.src = productImage(p);
      img.alt = p.name;
      img.style.cssText = 'width:48px;height:48px;object-fit:cover;border-radius:8px;background:#f2f2f2;flex-shrink:0;';
      img.onerror = function () { img.style.visibility = 'hidden'; };

      var info = document.createElement('div');
      info.style.cssText = 'min-width:0;flex:1;';
      var name = document.createElement('div');
      if (window.NassimProductName) NassimProductName.apply(name, p); else name.textContent = p.name;
      name.style.cssText = 'font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      var meta = document.createElement('div');
      meta.textContent = (p.line ? p.line + ' · ' : '') + Number(p.price).toFixed(3) + ' ' + (p.currency || 'KD');
      meta.style.cssText = 'font-size:12px;color:#777;';
      info.appendChild(name);
      info.appendChild(meta);

      a.appendChild(img);
      a.appendChild(info);
      el.appendChild(a);
    });
  }

  /* ---- Catalog source for term suggestions + destination resolution ----
     /api/catalog is the same script the listing pages use; it carries the
     categorySlug / departmentSlug / subcategorySlug fields the term click
     needs to find the right existing subcategory page. Loaded once, cached
     on the window object. */
  function loadCatalog() {
    if (window.NASSIM_PRODUCTS) return Promise.resolve(window.NASSIM_PRODUCTS);
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = '/api/catalog';
      s.onload = function () { resolve(window.NASSIM_PRODUCTS || []); };
      s.onerror = function () { resolve([]); };
      document.head.appendChild(s);
      /* fallback poll in case the script tag loads after the event */
      var n = 0;
      (function poll() {
        if (window.NASSIM_PRODUCTS) return resolve(window.NASSIM_PRODUCTS);
        if (++n > 100) return resolve([]);
        setTimeout(poll, 100);
      })();
    });
  }

  /* UNIQUE meaningful word suggestions: split matching product names into
     words, keep the words that contain the query, dedupe case-insensitively,
     keep the first-seen capitalization, skip single characters. Each entry
     also carries the DISTINCT departments of the products that produced the
     word, so identical names in different departments can be disambiguated. */
  function wordSuggestions(list, q) {
    var ql = q.toLowerCase();
    var seen = {}, out = [];
    list.forEach(function (p) {
      var dept = String(p.departmentName || "").trim();
      String((p.name || '') + ' ' + (p.nameAr || '')).split(/[^A-Za-z0-9\u0600-\u06FF]+/).forEach(function (w) {
        if (w.length < 2) return;
        var lw = w.toLowerCase();
        if (lw.indexOf(ql) === -1) return;
        var e = seen[lw];
        if (!e) {
          e = seen[lw] = { word: w, depts: [] };
          out.push(e);
        }
        if (dept && e.depts.indexOf(dept) === -1) e.depts.push(dept);
      });
    });
    return out.slice(0, 8);
  }

  /* ---- Listing-page scope ----
     On listing/category pages (which set NASSIM_LISTING_SEARCH_FILTER_ACTIVE),
     the top-nav search is scoped to the CURRENT page's products only: the
     suggestions come only from this page's catalogue slice and a clicked
     term applies ?search= to THIS page (its own filter pipeline does the
     filtering and shows "No products found." when nothing matches). The
     user is never redirected to another category just because a match
     exists there. */
  function onListingPage() {
    return !!window.NASSIM_LISTING_SEARCH_FILTER_ACTIVE;
  }

  function pageFor(p) {
    var dep = p.departmentSlug || '', cat = p.categorySlug || '';
    /* Some category slugs already embed their department ("warehouse-
       trolleys-baskets" in the Warehouse department) — never duplicate the
       prefix, or the built page name matches no real file. */
    if (dep && cat.indexOf(dep + '-') === 0) return '/' + cat + '.html';
    return '/' + dep + '-' + cat + '.html';
  }

  /* Only the products that belong to the current listing page. */
  function scopeToCurrentPage(list) {
    var here = location.pathname;
    return (list || []).filter(function (p) { return pageFor(p) === here; });
  }

  /* Destination for a clicked term: find every product whose name contains
     the word and group them by their EXISTING page (data-driven — the term
     never has to equal a subcategory name). The destination is the page with
     the most matches. The search filter on that page applies to the WHOLE
     category, so NO matching product is ever discarded: &sub= is appended
     ONLY when every single match lives in one subcategory (pinning the page
     to it is then exact); when matches span several subcategories the page
     opens on its full category listing with the term filter applied.

     On a listing page this ALWAYS resolves to the current page: the scope
     of the top-nav search is the current category, never the catalogue.
     An optional department narrows the candidate set when one suggestion
     label was split per department (see renderTerms). */
  function destinationFor(word, list, dept) {
    var wl = word.toLowerCase();
    var candidates = dept
      ? list.filter(function (p) { return String(p.departmentName || "").trim() === dept; })
      : list;
    if (onListingPage()) {
      return location.pathname + '?search=' + encodeURIComponent(word);
    }
    var pages = {};
    candidates.forEach(function (p) {
      if (String(p.name || '').toLowerCase().indexOf(wl) === -1) return;
      var page = pageFor(p);
      if (!pages[page]) pages[page] = { n: 0, subs: {} };
      pages[page].n++;
      var sub = p.subcategorySlug || '';
      pages[page].subs[sub] = (pages[page].subs[sub] || 0) + 1;
    });
    var keys = Object.keys(pages);
    if (!keys.length) return null;
    keys.sort(function (a, b) { return pages[b].n - pages[a].n; });
    var page = keys[0], info = pages[page];
    var url = page + '?search=' + encodeURIComponent(word);
    var subs = Object.keys(info.subs);
    if (subs.length === 1 && subs[0]) url += '&sub=' + encodeURIComponent(subs[0]);
    return url;
  }

  /* Render the term suggestions. Clicking one navigates to the destination
     page, which filters itself via ?search=.

     Department disambiguation (generic, data-driven): when a suggested word
     occurs in MORE THAN ONE department, one suggestion is rendered PER
     department, labelled "[first department word] [word]" — e.g. "Trolley"
     under Supermarket AND Warehouse becomes "Supermarket Trolley" and
     "Warehouse Trolley", each linking to its own department's page. A word
     confined to a single department keeps its plain name (no "Houseware
     Knife" noise). */
  function renderTerms(terms, list, targetEl) {
    var el = targetEl || resultsEl;
    if (!el) return;
    el.innerHTML = '';
    if (!terms.length) {
      var emptyP = document.createElement('p');
      emptyP.style.cssText = 'padding:24px;text-align:center;color:#888;font-size:14px;';
      emptyP.textContent = 'No products found';
      el.appendChild(emptyP);
      return;
    }
    var rows = [];
    terms.forEach(function (entry) {
      var word = entry.word, depts = entry.depts || [];
      if (depts.length > 1) {
        depts.forEach(function (d) {
          rows.push({
            label: d.split(/\s+/)[0] + ' ' + word,
            word: word,
            dept: d
          });
        });
      } else {
        rows.push({ label: word, word: word, dept: depts[0] || undefined });
      }
    });
    rows.forEach(function (row) {
      var a = document.createElement('a');
      var dest = destinationFor(row.word, list, row.dept);
      a.href = dest || '#';
      a.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 16px;text-decoration:none;color:inherit;border-bottom:1px solid rgba(0,0,0,0.06);';
      a.onmouseenter = function () { a.style.background = 'rgba(0,0,0,0.04)'; };
      a.onmouseleave = function () { a.style.background = 'transparent'; };

      var icon = document.createElement('span');
      icon.className = 'material-symbols-outlined';
      icon.textContent = 'search';
      icon.style.cssText = 'font-size:18px;color:#888;flex-shrink:0;';

      var label = document.createElement('div');
      label.textContent = row.label;
      label.style.cssText = 'font-size:14px;font-weight:600;';

      a.appendChild(icon);
      a.appendChild(label);
      if (!dest) a.addEventListener('click', function (e) { e.preventDefault(); });
      el.appendChild(a);
    });
  }

  /* ---- Search logic: term suggestions ---- */
  function search(q, targetEl) {
    q = q.trim().toLowerCase();
    loadCatalog().then(function (list) {
      /* Empty query → show nothing (no random products) */
      if (!q) {
        if (targetEl) targetEl.innerHTML = '';
        else if (resultsEl) resultsEl.innerHTML = '';
        return;
      }
      /* product-name matching — multi-word aware with combination
         priority + first-term fallback (shared with the listing pages'
         filter pipeline) — then deduplicated word suggestions instead of
         repeated full names. On a listing page only THIS page's products
         are searched. */
      var scope = onListingPage() ? scopeToCurrentPage(list) : list;
      var effective = effectiveQuery(q, scope);
      var matching = scope.filter(function (p) {
        return nameMatchesQuery((p.name || '') + ' ' + (p.nameAr || ''), effective);
      });
      renderTerms(wordSuggestions(matching, q), scope, targetEl);
    });
  }

  /* ---- Legacy overlay (kept for backward compatibility) ---- */
  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'nassim-search-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);display:none;align-items:flex-start;justify-content:center;padding:10vh 16px 16px;';

    var panel = document.createElement('div');
    panel.style.cssText = 'background:#fff;color:#111;width:100%;max-width:560px;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);display:flex;flex-direction:column;max-height:70vh;';

    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid rgba(0,0,0,0.08);';
    /* Arabic (html.lang-ar): mirror the input row — close button LEFT,
       input with right-aligned text on the RIGHT. English stays LTR.
       The home5 styling (home5-mobile.css) mirrors the glyph/padding to
       match. Page direction is not changed — this row only. */
    bar.dir = document.documentElement.classList.contains('lang-ar') ? 'rtl' : 'ltr';
    inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.placeholder = 'Search products...'; // three dots — matches the existing i18n key ('search products...') so the shared mapping applies
    inputEl.setAttribute('aria-label', 'Search products');
    inputEl.style.cssText = 'flex:1;border:none;outline:none;font-size:16px;background:transparent;color:#111;';
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Close search');
    closeBtn.style.cssText = 'border:none;background:none;font-size:16px;cursor:pointer;color:#777;padding:4px 8px;';
    closeBtn.addEventListener('click', closeOverlay);
    bar.appendChild(inputEl);
    bar.appendChild(closeBtn);

    resultsEl = document.createElement('div');
    resultsEl.style.cssText = 'overflow-y:auto;flex:1;';

    panel.appendChild(bar);
    panel.appendChild(resultsEl);
    overlay.appendChild(panel);

    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeOverlay(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.style.display !== 'none') closeOverlay();
    });

    var debounce = null;
    inputEl.addEventListener('input', function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () { search(inputEl.value); }, 150);
    });
    /* Mobile keyboard dismissal ("Done", tap-outside, popup close all end
       in a blur) → restore the pre-focus viewport once the keyboard has
       actually closed. Never restores while the keyboard is still open. */
    inputEl.addEventListener('blur', onSearchInputBlur);

    /* Selecting a result navigates natively via the link's href. Close the
       popup BEFORE that navigation happens, so returning via browser Back
       (including from bfcache) finds the popup closed. Capture phase so it
       runs before any default navigation work; the link's own behaviour
       (href, ranking, target) is untouched. */
    resultsEl.addEventListener('click', function (e) {
      var link = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (link && link.getAttribute('href') && link.getAttribute('href') !== '#') closeOverlay();
    }, true);

    document.body.appendChild(overlay);
  }

  /* Returning to this page via browser Back (often bfcache) must always find
     the search popup closed, whatever state the snapshot froze. */
  window.addEventListener('pageshow', function () {
    if (overlay && overlay.style.display !== 'none') closeOverlay();
  });

  function openOverlay() {
    if (!overlay) buildOverlay();
    overlay.style.display = 'flex';
    inputEl.value = '';
    search('');
    /* Capture the pre-focus viewport state (mobile only) so the natural
       input zoom can be undone after the keyboard is dismissed. Must run
       BEFORE the focus below — after focus the browser has already zoomed. */
    armMobileZoomRestore();
    setTimeout(function () { inputEl.focus(); }, 50);
  }

  function closeOverlay() {
    if (overlay) overlay.style.display = 'none';
    if (inputEl && document.activeElement === inputEl) inputEl.blur();
    /* If the keyboard is already gone, restore the original viewport as
       part of the close; if it is still open, this defers to the blur /
       viewport-resize lifecycle and completes once the keyboard closes. */
    requestMobileZoomRestore();
  }

  /* ---- Mobile input-zoom restoration (shared popup input) ----
     On mobile, focusing the search input lets the browser zoom in naturally
     while typing — this is NEVER prevented. Some mobile browsers keep that
     zoom and/or a shifted scroll position after the keyboard is dismissed,
     so the pre-focus state (visualViewport scale/offset + window scroll) is
     captured immediately before focus and restored exactly once, after the
     keyboard has actually closed. Desktop and non-touch browsers are never
     touched. No CSS transforms, no manual scaling, no meta-tag changes. */
  var zoomRestore = null; // active search interaction's captured state

  function isMobileZoomContext() {
    return window.matchMedia('(max-width: 767px), (orientation: portrait)').matches &&
      (('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0);
  }

  function armMobileZoomRestore() {
    if (!isMobileZoomContext()) return;
    var v = window.visualViewport;
    zoomRestore = {
      scale: v ? v.scale : 1,
      offsetTop: v ? v.offsetTop : 0,
      offsetLeft: v ? v.offsetLeft : 0,
      scrollX: window.scrollX || window.pageXOffset || 0,
      scrollY: window.scrollY || window.pageYOffset || 0,
      innerHeight: window.innerHeight,
      vvHeight: v ? v.height : window.innerHeight,
      blurred: false,
      restored: false,
      fallbackTimer: null
    };
    attachViewportWatchers();
  }

  var vvWatchersAttached = false;
  function attachViewportWatchers() {
    var v = window.visualViewport;
    if (!v || vvWatchersAttached) return;
    vvWatchersAttached = true;
    v.addEventListener('resize', onViewportSettled);
    v.addEventListener('scroll', onViewportSettled);
  }

  function detachViewportWatchers() {
    var v = window.visualViewport;
    if (!v || !vvWatchersAttached) return;
    vvWatchersAttached = false;
    v.removeEventListener('resize', onViewportSettled);
    v.removeEventListener('scroll', onViewportSettled);
  }

  function onViewportSettled() {
    /* The keyboard closing fires a visualViewport resize; only then may the
       pre-focus state be restored. While the keyboard is still open this
       is a no-op, so typing zoom is never fought mid-interaction. */
    if (zoomRestore && zoomRestore.blurred) requestMobileZoomRestore();
  }

  function onSearchInputBlur() {
    var s = zoomRestore;
    if (!s) return;
    s.blurred = true;
    requestMobileZoomRestore(s);
    /* Browsers that fire no visualViewport events after the keyboard closes
       would otherwise never trigger the resize path above. One short,
       bounded re-check — not a repeated zoom hack. */
    clearTimeout(s.fallbackTimer);
    s.fallbackTimer = setTimeout(function () { requestMobileZoomRestore(s); }, 250);
  }

  function requestMobileZoomRestore(s) {
    s = s || zoomRestore;
    if (!s || s.restored) return;
    var s = zoomRestore;
    var v = window.visualViewport;
    /* Keyboard must actually be gone: visual viewport back near its
       pre-focus height. Otherwise stay out of the way (keyboard still up). */
    var keyboardClosed = !v ||
      v.height >= Math.min(s.vvHeight, s.innerHeight) - 2;
    if (!keyboardClosed) return;
    s.restored = true;
    clearTimeout(s.fallbackTimer);
    /* Teardown must only clear THIS interaction's state: a previous
       restore finishing asynchronously must never null a newer capture. */
    var finish = function () {
      if (zoomRestore === s) {
        detachViewportWatchers();
        zoomRestore = null;
      }
    };
    requestAnimationFrame(function () {
      window.scrollTo(s.scrollX, s.scrollY);
      if (v && Math.abs(v.scale - s.scale) > 0.01) {
        /* The browser resets the pinch/input scale asynchronously after
           blur; keep the scroll pinned until it settles (bounded to 1s). */
        var deadline = Date.now() + 1000;
        var watch = function () {
          window.scrollTo(s.scrollX, s.scrollY);
          if (!v || Math.abs(v.scale - s.scale) <= 0.01 || Date.now() > deadline) {
            finish();
            return;
          }
          requestAnimationFrame(watch);
        };
        requestAnimationFrame(watch);
      } else {
        finish();
      }
    });
  }

  /* ---- Shared search state (ONE search bar for the whole site) ----
     Typing in any top-nav search box updates the shared term: the other
     top-nav input on this page (desktop ↔ mobile), the saved term that
     every page restores on load, the URL ?search= (so refresh and
     back/forward keep it), and — on listing pages — the page's live
     product filter through its existing applyFiltersAndSort hook. */
  function syncCounterpartInputs(value) {
    ["desktop-search-input", "mobile-inline-search-input"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.value !== value) el.value = value; // never touch the input being typed in
    });
  }

  function updateSharedSearch(raw) {
    var term = raw || "";
    syncCounterpartInputs(term);
    try {
      if (term) sessionStorage.setItem("nassimSearchTerm", term);
      else sessionStorage.removeItem("nassimSearchTerm");
    } catch (e) { /* storage unavailable — URL still carries the term */ }
    try {
      var url = new URL(location.href);
      var has = url.searchParams.has("search");
      if (term) {
        if (url.searchParams.get("search") !== term) {
          url.searchParams.set("search", term);
          window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
        }
      } else if (has) {
        url.searchParams.delete("search");
        window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
      }
    } catch (e) { /* keep the page running without the URL sync */ }
    if (window.NASSIM_LISTING_SEARCH_FILTER_ACTIVE) {
      window.NASSIM_LISTING_SEARCH_TERM = term.trim() || null;
      if (window.NassimColorFilterHooks && window.NassimColorFilterHooks.apply) {
        window.NassimColorFilterHooks.apply();
      }
    }
  }

  /* ---- Inline search bar wiring (desktop + mobile top-nav bars) ----
     Targets #desktop-inline-search and #mobile-inline-search (forms with an
     <input> inside). Creates a dropdown below the input that shows filtered
     results. Empty query → dropdown hidden, no random products. */
  function initInlineBar() {
    ["desktop-inline-search", "mobile-inline-search"].forEach(function (formId) {
      var form = document.getElementById(formId);
      if (!form || form.dataset.nassimInlineBound) return;
      /* Some pages (e.g. product-view.html) wire the mobile bar themselves
         with their own flag — never double-bind those. */
      if (formId === "mobile-inline-search" && form.dataset.bound) return;
      form.dataset.nassimInlineBound = "1";

      var input = form.querySelector("input");
      if (!input) return;

      /* Create dropdown container */
      var dropdown = document.createElement("div");
      dropdown.id = formId + "-dropdown";
      dropdown.style.cssText = "position:absolute;top:100%;left:0;right:0;z-index:200;background:#fff;color:#111;border-radius:0 0 12px 12px;box-shadow:0 8px 24px rgba(0,0,0,0.18);max-height:60vh;overflow-y:auto;display:none;";
      form.appendChild(dropdown);

      var debounce = null;

      input.addEventListener("input", function () {
        clearTimeout(debounce);
        var q = input.value.trim();
        /* Shared search state updates immediately (every keystroke), so
           no character is ever lost across pages or inputs. */
        updateSharedSearch(input.value);
        if (!q) {
          dropdown.style.display = "none";
          dropdown.innerHTML = "";
          return;
        }
        debounce = setTimeout(function () {
          search(q, dropdown);
          dropdown.style.display = "block";
        }, 150);
      });

      input.addEventListener("focus", function () {
        if (input.value.trim()) {
          search(input.value.trim(), dropdown);
          dropdown.style.display = "block";
        }
      });

      /* Close dropdown when clicking outside */
      document.addEventListener("click", function (e) {
        if (!form.contains(e.target)) {
          dropdown.style.display = "none";
        }
      });

      /* Close dropdown on Escape */
      input.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          dropdown.style.display = "none";
          input.blur();
        }
      });

      /* Submitting the form (Enter key) must never reload the page with a
         meaningless ?q= — run the search and show the results dropdown
         instead. Empty query just focuses the input. */
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var q = input.value.trim();
        updateSharedSearch(input.value);
        if (!q) {
          dropdown.style.display = "none";
          input.focus();
          return;
        }
        clearTimeout(debounce);
        search(q, dropdown);
        dropdown.style.display = "block";
      });
    });
  }

  /* ---- Bind legacy overlay triggers (for pages still using the icon button) ---- */
  function bindTriggers() {
    var spans = document.querySelectorAll('.material-symbols-outlined');
    spans.forEach(function (span) {
      if (span.textContent.trim() !== 'search') return;
      if (span.closest('#nassim-search-overlay')) return;
      if (span.closest('label')) return;
      /* Skip the inline desktop search icon (inside #desktop-inline-search) */
      if (span.closest('#desktop-inline-search')) return;
      if (span.closest('.relative') && span.getAttribute('data-icon') === 'search') return;
      var trigger = span.closest('button') || span;
      if (trigger.dataset.nassimSearchBound) return;
      trigger.dataset.nassimSearchBound = '1';
      trigger.style.cursor = 'pointer';
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        openOverlay();
      });
    });
  }

  /* ---- Search-context navigation guard ----
     The ?search= term belongs to the page it was opened on. When the user
     navigates to a DIFFERENT page via any link (category, department, …),
     strip ?search= from the destination in the capture phase, so no other
     handler or href mutation can carry the previous search into a new
     category. Same-page links keep the term (the search context stays).

     Links generated BY the search UI itself (the term suggestions in the
     inline dropdowns / legacy overlay) are exempt: their ?search= IS the
     new search being launched, and stripping it there broke cross-page
     searches (the destination page loaded unfiltered). Category links
     never live inside the search bars, so the guard still applies to
     them. */
  function isSearchUiLink(a) {
    return !!(
      a.closest("#desktop-inline-search") ||
      a.closest("#mobile-inline-search") ||
      a.closest("#nassim-search-overlay")
    );
  }
  function bindNavigationGuard() {
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var el = e.target;
      var a = el && el.closest ? el.closest("a[href]") : null;
      if (!a) return;
      if (isSearchUiLink(a)) return; // search suggestion: carry its ?search=
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) === "#") return;
      var url;
      try { url = new URL(href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) return; // same page: keep context
      if (!url.searchParams.has("search")) return;
      url.searchParams.delete("search");
      a.setAttribute("href", url.pathname + url.search + url.hash);
    }, true);
  }

  /* ---- Search-context display on NON-listing pages ----
     Listing pages manage their own inputs (listing-search-filter.js). Here,
     on other pages (e.g. a product page opened from the search results),
     restore the active term into the top search box so the context stays
     visible. Listing pages clear the saved term when they load without
     ?search=, so this can never resurrect an old category's search. */
  function restoreContextInputs() {
    if (window.NASSIM_LISTING_SEARCH_FILTER_ACTIVE) return;
    var term = "";
    try { term = sessionStorage.getItem("nassimSearchTerm") || ""; } catch (e) { return; }
    if (!term) return;
    ["desktop-search-input", "mobile-inline-search-input"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el.value) el.value = term;
    });
  }

  /* ---- Init ---- */
  function init() {
    bindTriggers();
    initInlineBar();
    bindNavigationGuard();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", restoreContextInputs);
    } else {
      restoreContextInputs();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.NassimSearch = {
    open: openOverlay,
    close: closeOverlay,
    search: search,
    loadProducts: loadProducts,
    render: render,
    matchName: nameMatchesQuery,
    effectiveQuery: effectiveQuery,
    getResultsEl: function () { return resultsEl; }
  };
})();
