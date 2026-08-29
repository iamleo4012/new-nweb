(function () {
  'use strict';

  var products = null;
  var overlay = null;
  var inputEl = null;
  var resultsEl = null;

  /* ---- Product data (fetched once, cached) ---- */
  function loadProducts() {
    if (products) return Promise.resolve(products);
    return fetch('/api/products', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        products = (data && data.data) || [];
        return products;
      })
      .catch(function () {
        products = [];
        return products;
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
      a.href = 'product view.html?id=' + encodeURIComponent(p.id);
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
      name.textContent = p.name;
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

  /* ---- Search logic ---- */
  function search(q, targetEl) {
    q = q.trim().toLowerCase();
    loadProducts().then(function (list) {
      /* Empty query → show nothing (no random products) */
      if (!q) {
        if (targetEl) targetEl.innerHTML = '';
        else if (resultsEl) resultsEl.innerHTML = '';
        return;
      }
      var terms = q.split(/\s+/);
      var filtered = list.filter(function (p) {
        var hay = (p.name + ' ' + (p.line || '') + ' ' + (p.sku || '') + ' ' + (p.description || '')).toLowerCase();
        return terms.every(function (t) { return hay.indexOf(t) !== -1; });
      });
      render(filtered, targetEl);
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
    inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.placeholder = 'Search products…';
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

    document.body.appendChild(overlay);
  }

  function openOverlay() {
    if (!overlay) buildOverlay();
    overlay.style.display = 'flex';
    inputEl.value = '';
    search('');
    setTimeout(function () { inputEl.focus(); }, 50);
  }

  function closeOverlay() {
    if (overlay) overlay.style.display = 'none';
  }

  /* ---- Desktop inline search bar wiring ----
     Targets #desktop-inline-search (a <form> with an <input> inside).
     Creates a dropdown below the input that shows filtered results.
     Empty query → dropdown hidden, no random products. */
  function initInlineBar() {
    var form = document.getElementById('desktop-inline-search');
    if (!form || form.dataset.nassimInlineBound) return;
    form.dataset.nassimInlineBound = '1';

    var input = form.querySelector('input');
    if (!input) return;

    /* Create dropdown container */
    var dropdown = document.createElement('div');
    dropdown.id = 'desktop-search-dropdown';
    dropdown.style.cssText = 'position:absolute;top:100%;left:0;right:0;z-index:200;background:#fff;color:#111;border-radius:0 0 12px 12px;box-shadow:0 8px 24px rgba(0,0,0,0.18);max-height:60vh;overflow-y:auto;display:none;';
    form.appendChild(dropdown);

    var debounce = null;

    input.addEventListener('input', function () {
      clearTimeout(debounce);
      var q = input.value.trim();
      if (!q) {
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
        return;
      }
      debounce = setTimeout(function () {
        search(q, dropdown);
        dropdown.style.display = 'block';
      }, 150);
    });

    input.addEventListener('focus', function () {
      if (input.value.trim()) {
        search(input.value.trim(), dropdown);
        dropdown.style.display = 'block';
      }
    });

    /* Close dropdown when clicking outside */
    document.addEventListener('click', function (e) {
      if (!form.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });

    /* Close dropdown on Escape */
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        dropdown.style.display = 'none';
        input.blur();
      }
    });

    /* Submitting the form (Enter key) must never reload the page with a
       meaningless ?q= — run the search and show the results dropdown
       instead. Empty query just focuses the input. */
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q) {
        dropdown.style.display = 'none';
        input.focus();
        return;
      }
      clearTimeout(debounce);
      search(q, dropdown);
      dropdown.style.display = 'block';
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

  /* ---- Init ---- */
  function init() {
    bindTriggers();
    initInlineBar();
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
    getResultsEl: function () { return resultsEl; }
  };
})();
