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
    /* ---- Sort By dropdown VISUAL POLISH (styling only) ----
       Applies to BOTH variants: the pre-existing grid-header <select> and the
       JS-built .nsb-select. Rounded corners, subtle shadow, comfortable
       height/padding, bronze hover + focus states (site secondary #825335).
       Dark mode uses the site's dark palette. Layout, RTL positioning,
       options and sorting logic are untouched. */
    + ".subcat-grid-header select, .nsb-select {"
    + "  border-radius: 10px;"
    + "  box-shadow: 0 2px 8px rgba(13,27,42,0.06) !important;"
    + "  transition: border-color 0.15s ease, box-shadow 0.15s ease;"
    + "}"
    + ".nassim-sort-bar .nsb-select { min-height: 42px; }"
    + ".subcat-grid-header select:hover, .nassim-sort-bar .nsb-select:hover { border-color: #825335; }"
    + ".subcat-grid-header select:focus, .nassim-sort-bar .nsb-select:focus {"
    + "  outline: none;"
    + "  border-color: #825335;"
    + "  box-shadow: 0 0 0 3px rgba(130,83,53,0.18) !important;"
    + "}"
    + "html.dark .subcat-grid-header select, html.dark .nassim-sort-bar .nsb-select { box-shadow: 0 2px 10px rgba(0,0,0,0.35) !important; }"
    + "html.dark .subcat-grid-header select:hover, html.dark .nassim-sort-bar .nsb-select:hover,"
    + "html.dark .subcat-grid-header select:focus, html.dark .nassim-sort-bar .nsb-select:focus {"
    + "  border-color: var(--color-secondary, #f7b994);"
    + "}"
    + "html.dark .subcat-grid-header select:focus, html.dark .nassim-sort-bar .nsb-select:focus {"
    + "  box-shadow: 0 0 0 3px rgba(247,185,148,0.2);"
    + "}"
    /* "Select" placeholder state: muted while no sort is chosen, normal
       color as soon as a real option is picked. */
    + "select:has(option[value='']:checked) { color: rgba(13,27,42,0.45); }"
    + "html.dark select:has(option[value='']:checked) { color: rgba(255,255,255,0.5); }"
    /* Dropdown list items (Price: Low to High / High to Low) must be BLACK
       and fully visible when the list opens — they inherit the select's
       muted placeholder color on some platforms. The hidden "Select"
       placeholder never shows in the list, so this only affects the two
       real sort options. Dark mode keeps them readable (white on dark). */
    + ".subcat-grid-header select option, .nassim-sort-bar .nsb-select option { color: #000000; background-color: #ffffff; }"
    + "html.dark .subcat-grid-header select option, html.dark .nassim-sort-bar .nsb-select option { color: #ffffff; background-color: #141a22; }"
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
      /* index 0 = the "Select" placeholder → back to DEFAULT (products in
         natural order, no sorting). 1 = Low→High, 2 = High→Low (canonical
         order, translation-proof). The dropdown LIST shows only the two sort
         options — the placeholder stays the closed control's label via its
         `hidden` attribute. */
      if (select.selectedIndex === 0) return applySort("none");
      applySort(select.selectedIndex === 2 ? "high" : "low");
    });
  }

  ready(function () {
    document.head.insertAdjacentHTML("beforeend", CSS);

    /* Keep the visible select in step with the hidden sorting radios: when a
       sort chip is removed from Filtered By (its × button) or Clear All runs,
       the radios clear — the select must then return to the "Select"
       placeholder (default, natural order). Cheap poll; idempotent. */
    setInterval(function () {
      var select = document.querySelector(".subcat-grid-header select") ||
                   document.querySelector(".nsb-select");
      if (!select) return;
      var anyChecked = Array.prototype.some.call(
        document.querySelectorAll('.filter-radio[name="sorting"]'),
        function (r) { return r.checked; }
      );
      if (!anyChecked && select.selectedIndex !== 0) select.selectedIndex = 0;
    }, 400);

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
        '<option value="" selected hidden>Select</option>' +
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
