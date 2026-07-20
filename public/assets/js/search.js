(function () {
  'use strict';

  var products = null;
  var overlay = null;
  var inputEl = null;
  var resultsEl = null;

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

  function render(list) {
    resultsEl.innerHTML = '';
    if (!list.length) {
      var empty = document.createElement('p');
      empty.style.cssText = 'padding:24px;text-align:center;color:#888;font-size:14px;';
      empty.textContent = 'No products found';
      resultsEl.appendChild(empty);
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
      resultsEl.appendChild(a);
    });
  }

  function search(q) {
    q = q.trim().toLowerCase();
    loadProducts().then(function (list) {
      if (!q) { render(list.slice(0, 12)); return; }
      var terms = q.split(/\s+/);
      render(list.filter(function (p) {
        var hay = (p.name + ' ' + (p.line || '') + ' ' + (p.sku || '') + ' ' + (p.description || '')).toLowerCase();
        return terms.every(function (t) { return hay.indexOf(t) !== -1; });
      }));
    });
  }

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'nassim-search-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);display:none;align-items:flex-start;justify-content:center;padding:10vh 16px 16px;';

    var panel = document.createElement('div');
    panel.style.cssText = 'background:#fff;color:#111;width:100%;max-width:560px;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);display:flex;flex-direction:column;max-height:70vh;';

    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid rgba(0,0,0,0.08);';
    inputEl = document.createElement('input');
    inputEl.type = 'search';
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

  function bindTriggers() {
    var spans = document.querySelectorAll('.material-symbols-outlined');
    spans.forEach(function (span) {
      if (span.textContent.trim() !== 'search') return;
      if (span.closest('#nassim-search-overlay')) return;
      if (span.closest('label') || span.closest('.relative') && span.getAttribute('data-icon') === 'search') return;
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindTriggers);
  } else {
    bindTriggers();
  }

  window.NassimSearch = { open: openOverlay, close: closeOverlay };
})();
