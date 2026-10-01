/* ============================================================================
   AL-NASSIM — shared Color filter for the product listing pages
   ============================================================================
   ONE implementation used by every listing page that has a Color accordion
   (a <details> containing input.filter-checkbox[name="color"]):

     • Renders the 12 common color options into the accordion's option list,
       replacing any static/dummy rows (the old hardcoded counts — 156/89/
       42/28 — no longer exist anywhere).
     • Wires the accordion's search input as a live, case-insensitive search
       over ONLY these 12 options, with a clickable suggestion dropdown
       (click = select). Works with mouse and touch.
     • Filtering itself stays in each page's existing applyFiltersAndSort()
       via window.NassimColorFilter.matchProduct — the SAME pipeline as
       Price Range / Sort / category. See the matchProduct contract below.

   DATA SOURCE (future-ready, nothing hardcoded per product):
     Products come from /api/catalog, which already exposes each product's
     color relations:  p.colors = [{ name: "White" }, …]
     Today no product has color assignments, so ANY active color correctly
     yields 0 matching products. When real product→color assignments are
     added later, the same code returns those products — no changes needed.
     Products are NEVER guessed or assigned colors here.

   ARABIC:
     Color names in AR come ONLY from the approved central map
     (window.NASSIM_I18N — "white"→"أبيض" etc.). Options without an approved
     translation stay English. Never machine-translated. The re-render on
     the html.lang-ar toggle keeps labels, search and dropdown consistent.
   ========================================================================== */
(function () {
  'use strict';
  if (window.NassimColorFilter) return; // idempotent

  /* The 12 common color options. `swatch` is UI-only — filtering always
     compares the option NAME against the product's own color data. */
  var COLORS = [
    { name: 'White',       css: '#ffffff', initial: true },
    { name: 'Black',       css: '#111111', initial: true },
    { name: 'Silver',       css: '#c0c0c0', initial: true },
    { name: 'Blue',        css: '#2563eb' },
    { name: 'Green',       css: '#16a34a' },
    { name: 'Red',         css: '#dc2626' },
    { name: 'Yellow',      css: '#facc15' },
    { name: 'Brown',       css: '#92400e' },
    { name: 'Orange',      css: '#f97316' },
    { name: 'Pink',        css: '#f9a8d4' },
    { name: 'Purple',      css: '#9333ea' },
    { name: 'Multicolour', gradient: true }
  ];

  function norm(s) {
    return String(s == null ? '' : s).normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function isAr() { return document.documentElement.classList.contains('lang-ar'); }

  /* Approved Arabic label from the EXISTING central map — never invented. */
  function labelFor(name) {
    if (!isAr() || !window.NASSIM_I18N) return name;
    return window.NASSIM_I18N[norm(name)] || name;
  }

  /* ---------- filtering contract used by the pages ---------- */

  function activeColors() {
    return Array.prototype.slice.call(
      document.querySelectorAll('input.filter-checkbox[name="color"]:checked')
    ).map(function (cb) { return cb.getAttribute('data-color'); }).filter(Boolean);
  }

  /* Called by each page's applyFiltersAndSort(): a product passes when no
     color is selected, or when at least ONE of the product's OWN color
     assignments (p.colors[].name from /api/catalog) matches a selected
     option (any-of, case-insensitive). Products with no color assignments
     match NOTHING while a color filter is active — never faked. */
  function matchProduct(p) {
    var active = activeColors();
    if (!active.length) return true;
    var wanted = {};
    active.forEach(function (n) { wanted[norm(n)] = true; });
    var colors = (p && p.colors) || [];
    if (!colors.length) return false;
    for (var i = 0; i < colors.length; i++) {
      if (wanted[norm(colors[i] && colors[i].name)]) return true;
    }
    return false;
  }

  /* ---------- DOM: render rows + search + suggestions ---------- */

  var inbox = { list: null, search: null, dropdown: null, details: null };

  function swatchHtml(c) {
    if (c.gradient) {
      /* the SAME multicolour indicator the pages already used */
      return '<div class="w-3 h-3 rounded-full border border-outline-variant/30 dark:border-white/30 bg-gradient-to-tr from-rose-400 via-emerald-400 to-indigo-400"></div>';
    }
    /* white/yellow need the border to stay visible; all circles keep the
       standard outline used by the existing rows */
    return '<div class="w-3 h-3 rounded-full border border-outline-variant/30 dark:border-white/30" style="background:' + c.css + '"></div>';
  }

  function rowHtml(c) {
    var label = labelFor(c.name);
    return (
      '<label class="cf-row flex items-center justify-between group/label cursor-pointer pl-1" data-color-row="' + esc(c.name) + '">' +
        '<div class="flex items-center gap-3">' +
          '<input class="flex-shrink-0 filter-checkbox" name="color" type="checkbox" data-color="' + esc(c.name) + '"/>' +
          swatchHtml(c) +
          '<span class="text-xs text-on-surface-variant dark:text-white/70 group-hover/label:text-primary dark:group-hover/label:text-white transition-colors">' + esc(label) + '</span>' +
        '</div>' +
      '</label>'
    );
    /* NO counts — the old static numbers were dummy data and are gone. */
  }

  /* Compact default view: ONLY the first three options are visible without a
     search. The remaining options exist in the DOM (their state drives
     filtering and chips) but appear ONLY as search results. */
  function applyListVisibility(query) {
    var q = norm(query);
    Array.prototype.forEach.call(inbox.list.children, function (row) {
      var name = row.getAttribute('data-color-row');
      var c = COLORS.find(function (x) { return x.name === name; });
      if (!c) return;
      var matches = !q || norm(c.name).indexOf(q) !== -1 || norm(labelFor(c.name)).indexOf(q) !== -1;
      row.style.display = matches && (q || c.initial) ? '' : 'none';
    });
  }

  function renderRows() {
    /* preserve the current selection across re-renders (language and
       dark-mode toggles both re-write html classes) */
    var checked = {};
    Array.prototype.forEach.call(
      inbox.list.querySelectorAll('input.filter-checkbox[name="color"]:checked'),
      function (cb) { checked[cb.getAttribute('data-color')] = true; }
    );
    inbox.list.innerHTML = COLORS.map(function (c) {
      var row = rowHtml(c);
      if (checked[c.name]) {
        return row.replace('type="checkbox"', 'type="checkbox" checked');
      }
      return row;
    }).join('');
    applyListVisibility(inbox.search ? inbox.search.value : '');
  }

  function renderDropdown(matches) {
    if (!inbox.dropdown) return;
    if (!matches.length) { inbox.dropdown.innerHTML = ''; inbox.dropdown.style.display = 'none'; return; }
    inbox.dropdown.innerHTML = matches.map(function (c) {
      var label = labelFor(c.name);
      return '<button type="button" class="cf-sug flex items-center gap-3 w-full text-left px-3 py-2 hover:bg-surface-container-low dark:hover:bg-[#1a1f2e] transition-colors" data-color-sug="' + esc(c.name) + '">' +
        swatchHtml(c) +
        '<span class="text-xs text-on-surface-variant dark:text-white/70">' + esc(label) + '</span>' +
        '</button>';
    }).join('');
    inbox.dropdown.style.display = 'block';
  }

  function closeDropdown() {
    if (inbox.dropdown) { inbox.dropdown.style.display = 'none'; }
  }

  function selectColor(name) {
    var cb = inbox.list.querySelector('input.filter-checkbox[data-color="' + name.replace(/"/g, '\\"') + '"]');
    if (!cb || cb.checked) { closeDropdown(); return; }
    cb.checked = true;
    closeDropdown();
    /* back to the compact view: search cleared, only the first three rows
       visible — the selected option stays active (chip + filtering) even
       when it is not among them */
    if (inbox.search) inbox.search.value = '';
    applyListVisibility('');
    /* run the page's EXISTING pipeline — chips + products, same as any
       other checkbox on the page */
    var hooks = window.NassimColorFilterHooks || {};
    if (hooks.update) hooks.update();
    if (hooks.apply) hooks.apply();
  }

  function wireSearch() {
    if (!inbox.search) return;
    var wrap = inbox.search.closest('.relative') || inbox.search.parentElement;
    if (wrap && !wrap.querySelector('.cf-dropdown')) {
      var dd = document.createElement('div');
      dd.className = 'cf-dropdown absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-[#141a22] border border-outline-variant/30 dark:border-white/20 rounded-sm shadow-lg overflow-hidden max-h-56 overflow-y-auto';
      dd.style.display = 'none';
      wrap.appendChild(dd);
      inbox.dropdown = dd;
    } else if (wrap) {
      inbox.dropdown = wrap.querySelector('.cf-dropdown');
    }
    inbox.search.addEventListener('input', function () {
      var q = norm(inbox.search.value);
      var matches = COLORS.filter(function (c) {
        /* match the English name AND the active-language label */
        return !q || norm(c.name).indexOf(q) !== -1 || norm(labelFor(c.name)).indexOf(q) !== -1;
      });
      /* live-filter the visible rows (search sees ALL 12 options) */
      applyListVisibility(q);
      renderDropdown(q ? matches : []);
    });
    /* suggestion click (mousedown beats the input's blur; click covers
       keyboard/programmatic activation — selectColor is idempotent) */
    if (inbox.dropdown) {
      inbox.dropdown.addEventListener('mousedown', function (e) {
        var btn = e.target.closest('[data-color-sug]');
        if (!btn) return;
        e.preventDefault();
        selectColor(btn.getAttribute('data-color-sug'));
      });
      inbox.dropdown.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-color-sug]');
        if (!btn) return;
        e.preventDefault();
        selectColor(btn.getAttribute('data-color-sug'));
      });
    }
    inbox.search.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeDropdown(); inbox.search.value = ''; applyListVisibility(''); }
      if (e.key === 'Enter') {
        var first = inbox.dropdown && inbox.dropdown.querySelector('[data-color-sug]');
        if (first) { e.preventDefault(); selectColor(first.getAttribute('data-color-sug')); }
      }
    });
    document.addEventListener('click', function (e) {
      if (inbox.details && !inbox.details.contains(e.target)) closeDropdown();
    });
  }

  /* Delegated change handling for the rendered rows — the page's own
     listeners only exist on elements present at page load, so rows rendered
     here run the page pipeline through the hook (installed by the page). */
  function wireDelegation() {
    if (!inbox.list) return;
    inbox.list.addEventListener('change', function (e) {
      if (!e.target || !e.target.matches('input.filter-checkbox[name="color"]')) return;
      var hooks = window.NassimColorFilterHooks || {};
      if (hooks.update) hooks.update();
      if (hooks.apply) hooks.apply();
    });
  }

  function init() {
    var sample = document.querySelector('input.filter-checkbox[name="color"]');
    if (!sample) return; // page has no Color filter
    inbox.details = sample.closest('details');
    if (!inbox.details) return;
    /* option rows live in the container that currently holds the labels */
    inbox.list = sample.closest('label') && sample.closest('label').parentElement;
    if (!inbox.list) return;
    inbox.search = inbox.details.querySelector('input[type="text"]');

    renderRows();
    wireDelegation();
    wireSearch();

    /* keep Arabic/English labels in sync when the site language toggles
       (ignore other html class changes like dark mode) */
    var html = document.documentElement;
    var lastAr = isAr();
    new MutationObserver(function () {
      var nowAr = isAr();
      if (nowAr !== lastAr) { lastAr = nowAr; renderRows(); }
    }).observe(html, { attributes: true, attributeFilter: ['class', 'lang'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.NassimColorFilter = {
    matchProduct: matchProduct,
    activeColors: activeColors,
    options: COLORS.map(function (c) { return c.name; })
  };
})();
