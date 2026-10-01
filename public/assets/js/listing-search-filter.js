/* NASSIM listing pages: top-nav search-term destination filter.
   The top navigation search suggestions navigate here with
   ?search=<term> (plus ?sub=<subcategory> for the page itself).
   This script only CAPTURES the term into a global the page's own
   filter pipeline reads (applyFiltersAndSort) — filtering, sorting,
   pagination and counts keep working unchanged, and the filter
   survives a page refresh because it lives in the URL.

   Search context semantics:
   - The search TEXT is ONE SHARED STATE across the whole site: a listing
     page restores the term from its URL ?search= first, then from the
     saved shared term typed on any other page, and writes the resolved
     term back into the URL (replaceState) so refresh/back-forward keep
     it. Selecting a category via the sidebar chips clears the shared
     term, so an explicitly chosen category starts unfiltered.
   - While the term IS active it is mirrored into sessionStorage so a
     product page opened from the search results can keep showing it
     in the top search box (search.js restores it there).
   - The top-nav search inputs are kept in sync with this state
     (prefilled while active, cleared when not), including after
     bfcache back/forward restores. */
(function () {
  "use strict";

  var STORE_KEY = "nassimSearchTerm";

  function termFromURL() {
    try {
      return (new URLSearchParams(location.search).get("search") || "").trim();
    } catch (e) { return ""; }
  }

  /* Shared search TEXT: one search bar across the whole site. The URL
     ?search= of the CURRENT page is authoritative; when it is absent the
     saved shared term (typed on any other page) is restored so the bar
     follows the user across navigation. The resolved term is always
     written back to the URL so refresh/back-forward keep it. */
  function termFromStore() {
    try { return sessionStorage.getItem(STORE_KEY) || ""; } catch (e) { return ""; }
  }

  function setURLTerm(term) {
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
  }

  function saveContext(term) {
    try {
      if (term) sessionStorage.setItem(STORE_KEY, term);
      else sessionStorage.removeItem(STORE_KEY);
    } catch (e) { /* storage unavailable — URL is still authoritative */ }
  }

  function syncInputs(term) {
    ["desktop-search-input", "mobile-inline-search-input"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (term) {
        if (el.value !== term) el.value = term; // keep showing the active term
      } else if (el.value) {
        el.value = ""; // no active search here — drop any stale term
      }
    });
  }

  function apply() {
    var term = termFromURL() || termFromStore().trim();
    setURLTerm(term);
    window.NASSIM_LISTING_SEARCH_TERM = term || null;
    saveContext(term);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { syncInputs(term); });
    } else {
      syncInputs(term);
    }
  }

  /* Flag for search.js: this page manages its own input state. */
  window.NASSIM_LISTING_SEARCH_FILTER_ACTIVE = true;

  /* Drop the search term everywhere: the page's filter global, the saved
     context, the ?search= URL parameter and the top-nav inputs. */
  function clearSearchState() {
    if (!window.NASSIM_LISTING_SEARCH_TERM) return; // nothing active — no-op
    window.NASSIM_LISTING_SEARCH_TERM = null;
    saveContext("");
    try {
      var url = new URL(location.href);
      if (url.searchParams.has("search")) {
        url.searchParams.delete("search");
        window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
      }
    } catch (e) { /* keep the page running without the URL cleanup */ }
    if (document.readyState !== "loading") syncInputs("");
  }
  window.NASSIM_LISTING_SEARCH_CLEAR = clearSearchState;

  /* Sidebar category chips (All Kitchenware, Cutlery & Cleaver, …) start a
     NEW category context on the same page. Clear the search term in the
     capture phase — BEFORE the page's own chip handler re-filters — so the
     newly selected category shows ALL its products, never the old term's
     matches. Clicks elsewhere (same search context) are unaffected. */
  document.addEventListener("click", function (e) {
    var el = e.target;
    var btn = el && el.closest ? el.closest(".subcat-cat-chip, .subcat-tabs .category-btn") : null;
    if (!btn) return;
    clearSearchState();
    /* The page's own chip handler runs next (bubble phase) and re-filters
       through applyFiltersAndSort() — now without the search term. */
  }, true);

  apply();

  /* bfcache back/forward restores can resurrect old input values and JS
     state; the URL is authoritative, so re-apply whenever that happens. */
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) apply();
  });
})();
