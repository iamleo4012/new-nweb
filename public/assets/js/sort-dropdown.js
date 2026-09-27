/* ========================================================================
   NASSIM listing-page Sort By dropdown (shared across ALL listing pages)
   ------------------------------------------------------------------------
   Sort By lives ABOVE the product grid instead of inside the Filter By
   sidebar:
     • Desktop LTR: right-aligned above the grid. RTL (html.lang-ar):
       mirrored to the left automatically (flex + dir).
     • Mobile: same control, above the product list, no overflow.
   It drives the EXISTING hidden .filter-radio[name="sorting"] inputs —
   the exact state the page's own applyFiltersAndSort() reads by index
   ([0]=Price: Low to High, [1]=Price: High to Low) — so sorting logic,
   options and product ordering are unchanged. "Recommended" = none.
   On pages that already expose a sort <select> (.subcat-grid-header),
   that control is wired instead of building a duplicate bar.
   ======================================================================== */
(function () {
  "use strict";

  var CSS = ""
    + "<style>"
    /* the pre-existing header select bar (family: subcat-grid-header) */
    + ".subcat-grid-header > div:last-child { gap: 0.75rem; }"
    + ".subcat-grid-header > div:last-child > * + * { margin-left: 0 !important; }"
    + "html.lang-ar .subcat-grid-header select { padding-left: 2.5rem !important; padding-right: 1rem !important; }"
    /* AR desktop: the sort header must keep Sort By on the PRODUCT side
       (left edge of the product area), not pushed against the filter
       sidebar. rtl-overrides.css sets direction:rtl on this header, which
       sends the control to the sidebar side — mirror it back here. Scoped
       to the desktop row layout only; mobile column layout is untouched. */
    + "html.lang-ar .subcat-grid-header { direction: ltr; }"
    /* AR: inside the sort group the LABEL sits on the RIGHT and the dropdown
       on the LEFT (select first physically). Mirrors the group's internal
       flow only — group position, size and styling untouched. */
    + "html.lang-ar .subcat-grid-header > div:last-child { direction: rtl; }"
    + "@media (min-width: 768px) {"
    + "  html.lang-ar .subcat-grid-header { flex-direction: row-reverse; }"
    + "  html.lang-ar .subcat-grid-header > div:last-child { margin-left: 0 !important; }"
    + "}"
    /* Arabic mode is class-based (html.lang-ar); rtl-overrides.css already
       applies direction:rtl to .subcat-grid-header, which mirrors it — only
       the select's physical padding needs a fix for the left-side arrow. */
    + "html.lang-ar .nassim-sort-bar { direction: rtl; justify-content: space-between; }"
    + "@media (max-width: 767px) {"
    + "  .subcat-grid-header > div:first-child { display: none !important; }"
    + "  .subcat-grid-header select { max-width: 60vw; }"
    + "}"
    /* JS-built bar (pages without a grid header) */
    + ".nassim-sort-bar { display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; margin: 0 0 1.5rem; }"
    + ".nassim-sort-bar .nsb-label { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(13,27,42,0.6); }"
    + "html.dark .nassim-sort-bar .nsb-label { color: rgba(255,255,255,0.7); }"
    + ".nassim-sort-bar .nsb-select { background: #fff; border: 1px solid rgba(13,27,42,0.15); color: #0d1b2a; font-size: 0.875rem; font-weight: 500; padding: 0.5rem 2.5rem 0.5rem 1rem; border-radius: 2px; cursor: pointer; max-width: 60vw; }"
    + "html.dark .nassim-sort-bar .nsb-select { background-color: #1a1f2e; color: #fff; border-color: rgba(255,255,255,0.2); }"
    + ".nassim-sort-bar.nsb-mobile-only { display: flex; }"
    + "@media (min-width: 768px) { .nassim-sort-bar.nsb-mobile-only { display: none !important; } }"
    + "</style>";

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  /* Set the hidden sorting radios from a logical value and run the page's
     own change handler (updateFilterTags + applyFiltersAndSort). */
  function applySort(value) {
    var radios = document.querySelectorAll('.filter-radio[name="sorting"]');
    radios.forEach(function (r) { r.checked = false; });
    if (value === "low" && radios[0]) radios[0].checked = true;
    else if (value === "high" && radios[1]) radios[1].checked = true;
    if (radios[0]) radios[0].dispatchEvent(new Event("change", { bubbles: true }));
  }

  function optionValue(select, option) {
    return option.value || option.textContent.trim().toLowerCase();
  }

  function wireSelect(select) {
    if (!select || select.dataset.nassimSortWired === "1") return;
    select.dataset.nassimSortWired = "1";
    select.addEventListener("change", function () {
      /* every select this script owns has exactly two options in canonical
         order [Low→High, High→Low]; mapping by index is translation-proof */
      applySort(select.selectedIndex === 1 ? "high" : "low");
    });
  }

  ready(function () {
    document.head.insertAdjacentHTML("beforeend", CSS);

    /* 1. Pages that already have a sort select above the grid: wire it. */
    var headerSelect = document.querySelector(".subcat-grid-header select");
    if (headerSelect) { wireSelect(headerSelect); return; }

    /* 2. Pages with a desktop catalog header (#catalog-sort, wired by the
          page itself): add a mobile-only bar above the grid. */
    var grid = document.getElementById("product-grid");
    if (!grid || grid.dataset.nassimSortBar === "1") return;
    grid.dataset.nassimSortBar = "1";

    var bar = document.createElement("div");
    bar.className = "nassim-sort-bar" +
      (document.getElementById("catalog-sort") ? " nsb-mobile-only" : "");
    bar.innerHTML =
      '<span class="nsb-label">Sort By</span>' +
      '<select class="nsb-select" aria-label="Sort products">' +
        '<option value="low">Price: Low to High</option>' +
        '<option value="high">Price: High to Low</option>' +
      '</select>';
    grid.parentNode.insertBefore(bar, grid);
    wireSelect(bar.querySelector("select"));
    /* the bar was added after the i18n runtime's initial pass — let the
       EXISTING runtime translate its label for the current language */
    window.dispatchEvent(new Event("nassim-langchange"));
  });
})();
