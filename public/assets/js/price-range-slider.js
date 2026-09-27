/* ========================================================================
   NASSIM dual-handle price range slider (Filter By → Price (KWD))
   ------------------------------------------------------------------------
   Layout (top → bottom):
     [Min input] – [Max input]     ← manual entry, APPLY applies it
     KD <min>          KD <max>    ← live values
     ●━━━━━━━━━━━━━━━━━━━━●       ← dual-handle slider (live filtering)

   Integration contract with the EXISTING page filter logic (UNCHANGED):
     • The slider/manual inputs write their range into the existing hidden
       #price-min / #price-max inputs — the IDs the page's
       applyFiltersAndSort() already reads.
     • APPLY (#apply-price) commits the manual/selected range, then the
       page's own handler applies the existing price-filter logic.
     • CLEAR (#clear-price) and the active-filter tag/remove controls reset
       everything to the full range (no price filter).
   Slider movement filters IMMEDIATELY (throttled live apply) — manual
   inputs apply on APPLY (with Min ≤ Max validation, clamped to the
   dynamic range).

   RANGE AUTHORITY — the loaded product dataset, NEVER the rendered grid:
     max = Math.ceil(highest valid price among the page's own products
     (window.NASSIM_PRODUCTS filtered by window.NASSIM_CATEGORY)).
     Filtering itself always uses the actual unrounded prices.
     • dataset not injected yet  → slider waits (no invented maximum,
       no 0–0 collapse; last known boundary is kept until data arrives)
     • dataset injected, zero valid prices (genuinely empty catalog) →
       immediately 0 KWD — 0 KWD, with no fallback number and no timeout.
     The boundary is computed ONCE per dataset and then stays STABLE while
     the user drags: filtering the grid can never shrink or zero it, so a
     drag can never collapse the slider to 0–0 and moving one handle can
     never reset the other.
   ======================================================================== */
(function () {
  "use strict";

  var STEP = 0.05;           // KWD granularity (5 fils)
  var LIVE_APPLY_DELAY = 150; // ms throttle for slider live-filtering
  var state = {
    min: 0, max: 0,
    curMin: 0, curMax: 0,
    ready: false,           // false = dataset not arrived yet → loading display
    lastWritten: "",
    userCommitted: false,   // true once APPLY has been used
    dragging: false
  };

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }
  function fmt(v) { return String(Math.round(v * 1000) / 1000); }

  /* Dynamic maximum from the CURRENT page/category product dataset. Pages
     expose their category via window.NASSIM_CATEGORY, so prices from other
     categories are never used.
     returns: number  → ceil of the highest valid price (0 = genuinely
                         empty catalog → 0 KWD — 0 KWD)
              null     → dataset not available YET (never treated as empty) */
  function computeMax() {
    var list = window.NASSIM_PRODUCTS || window.allProducts || null;
    if (!list) return null;           // catalog not injected yet — keep waiting
    if (!list.length) return 0;       // loaded but zero products → 0–0 now
    if (window.NASSIM_CATEGORY) {
      list = list.filter(function (p) { return p && p.category === window.NASSIM_CATEGORY; });
    }
    var m = 0;
    for (var i = 0; i < list.length; i++) {
      var v = parseFloat(list[i] && list[i].price);
      if (!isNaN(v) && v > m) m = v;
    }
    /* Ceiling to the next whole KWD (1.99→2, 2.1→3, 0.75→1, 4.9→5, 9→9). */
    return Math.ceil(m);
  }

  /* Apply a freshly computed boundary. keepSelection preserves a committed
     APPLY range (clamped inside the new boundary); otherwise the selection
     follows the full 0 → max range. */
  function applyBoundary(m, keepSelection) {
    state.max = m;
    state.ready = true;
    if (!keepSelection || !state.userCommitted) {
      state.curMin = 0;
      state.curMax = m;
    } else {
      state.curMin = Math.min(state.curMin, m);
      state.curMax = Math.min(Math.max(state.curMax, state.curMin), m);
    }
    document.querySelectorAll("[data-price-slider]").forEach(render);
  }

  function hiddenInputs() {
    return {
      min: document.getElementById("price-min"),
      max: document.getElementById("price-max")
    };
  }
  function writeHidden(min, max) {
    var els = hiddenInputs();
    if (els.min) els.min.value = min;
    if (els.max) els.max.value = max;
    state.lastWritten = min + "|" + max;
  }

  function build(mount) {
    mount.dataset.npsInit = "1";
    mount.innerHTML =
      '<div class="nps">' +
        '<div class="nps-values">' +
          '<span class="nps-val">KD <span class="nps-min-text">0</span></span>' +
          '<span class="nps-val">KD <span class="nps-max-text">0</span></span>' +
        '</div>' +
        '<div class="nps-track-wrap">' +
          '<div class="nps-track"></div>' +
          '<div class="nps-fill"></div>' +
          '<input type="range" class="nps-range nps-range-min" aria-label="Minimum price"/>' +
          '<input type="range" class="nps-range nps-range-max" aria-label="Maximum price"/>' +
        '</div>' +
      '</div>';
  }

  function qs(root, cls) { return root.querySelector(cls); }

  function render(root) {
    var st = state;
    var minTxt = qs(root, ".nps-min-text"), maxTxt = qs(root, ".nps-max-text");
    var minR = qs(root, ".nps-range-min"), maxR = qs(root, ".nps-range-max");
    if (!st.ready) {
      /* Dataset not arrived yet: show a neutral loading state — never an
         invented maximum like 100. Handles are disabled and the manual
         inputs are left untouched until the real range is known. */
      minTxt.textContent = "—";
      maxTxt.textContent = "—";
      minR.value = "0"; maxR.value = "0";
      minR.disabled = true; maxR.disabled = true;
      qs(root, ".nps-fill").style.left = "0%";
      qs(root, ".nps-fill").style.width = "0%";
      return;
    }
    minR.disabled = false; maxR.disabled = false;
    minTxt.textContent = fmt(st.curMin);
    maxTxt.textContent = fmt(st.curMax);
    minR.min = "0"; minR.max = String(st.max); minR.step = String(STEP); minR.value = String(st.curMin);
    maxR.min = "0"; maxR.max = String(st.max); maxR.step = String(STEP); maxR.value = String(st.curMax);
    /* Fill band: LTR anchors it at the physical left; RTL anchors it at the
       physical RIGHT. The native range inputs already render their thumbs
       mirrored under direction:rtl (right = min side, left = max side), so
       only this fill calculation needs the direction-aware coordinate. The
       VALUES never change: curMin <= curMax in both directions. */
    var trackWrap = qs(root, ".nps-track-wrap");
    var rtl = trackWrap && getComputedStyle(trackWrap).direction === "rtl";
    var loFrac = st.max ? st.curMin / st.max : 0;
    var hiFrac = st.max ? st.curMax / st.max : 0;
    var startFrac = rtl ? 1 - hiFrac : loFrac;
    qs(root, ".nps-fill").style.left = (startFrac * 100) + "%";
    qs(root, ".nps-fill").style.width = (Math.abs(hiFrac - loFrac) * 100) + "%";
    /* The page's visible Min/Max inputs (above the slider) mirror the live
       values unless the user is typing in them */
    var minIn = document.getElementById("price-min"), maxIn = document.getElementById("price-max");
    if (document.activeElement !== minIn && minIn) minIn.value = fmt(st.curMin);
    if (document.activeElement !== maxIn && maxIn) maxIn.value = fmt(st.curMax);
  }

  function setRange(a, b, root) {
    var max = state.max;
    a = Math.max(0, Math.min(max, a));
    b = Math.max(0, Math.min(max, b));
    if (a > b) a = b;
    if (b < a) b = a;
    state.curMin = a; state.curMax = b;
    if (root) render(root);
  }

  /* Live filtering: write the committed range and let the page's OWN
     #apply-price handler run the existing filter logic. Throttled so a
     continuous drag applies at a sane rate. */
  var liveTimer = null;
  function liveApply() {
    writeHidden(fmt(state.curMin), fmt(state.curMax));
    if (liveTimer) return;
    liveTimer = setTimeout(function () {
      liveTimer = null;
      var btn = document.getElementById("apply-price");
      if (btn) btn.click();
    }, LIVE_APPLY_DELAY);
  }

  /* Keep every slider instance wired (drag = immediate filter). Each handle
     moves independently; the other handle's value is preserved verbatim, so
     dragging Min can never reset Max (or vice versa) — the boundary
     state.max never changes while dragging. */
  function wireEvents(root) {
    var minR = qs(root, ".nps-range-min"), maxR = qs(root, ".nps-range-max");
    function onDrag() {
      var a = parseFloat(minR.value), b = parseFloat(maxR.value);
      if (isNaN(a)) a = state.curMin;
      if (isNaN(b)) b = state.curMax;
      if (a > b) { a = b; minR.value = String(a); }
      if (b < a) { b = a; maxR.value = String(b); }
      setRange(a, b, root);
      liveApply();
    }
    minR.addEventListener("input", onDrag);
    maxR.addEventListener("input", onDrag);
    minR.addEventListener("change", onDrag);
    maxR.addEventListener("change", onDrag);
  }

  /* APPLY: capture phase — commit the range into the hidden inputs BEFORE
     the page's own #apply-price handler runs its existing filter logic.
     Manual Min/Max entries (the page's visible #price-min/#price-max boxes
     above the slider) take priority; otherwise the slider positions.
     Values are clamped to the valid dynamic range [0, state.max]. */
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("#apply-price")) {
      if (!state.ready) return;   // no real range yet — nothing to apply
      var minIn = document.getElementById("price-min");
      var maxIn = document.getElementById("price-max");
      var minRaw = minIn ? String(minIn.value).trim() : "";
      var maxRaw = maxIn ? String(maxIn.value).trim() : "";
      if (minRaw !== "" || maxRaw !== "") {
        var a = parseFloat(minRaw), b = parseFloat(maxRaw);
        if (isNaN(a)) a = 0;
        if (isNaN(b)) b = state.max;
        a = Math.max(0, Math.min(state.max, a));
        b = Math.max(0, Math.min(state.max, b));
        if (a > b) { var tmp = a; a = b; b = tmp; }   // validate Min ≤ Max
        setRange(a, b);
      }
      writeHidden(fmt(state.curMin), fmt(state.curMax));
      state.userCommitted = true;
      document.querySelectorAll("[data-price-slider]").forEach(render);
    }
  }, true);

  /* Manual inputs: Enter key applies immediately (same as clicking APPLY) */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var t = e.target;
    if (t && (t.id === "price-min" || t.id === "price-max")) {
      var btn = document.getElementById("apply-price");
      if (btn) btn.click();
    }
  });

  /* CLEAR / tag removal / Clear-All: page handlers empty the hidden inputs;
     reset the slider AND the manual inputs to the full range to match.
     "Full range" is always 0 → calculated product maximum, so repeated
     APPLY → CLEAR → drag → APPLY cycles are stable. */
  function resetFromInputs() {
    var els = hiddenInputs();
    var minV = els.min ? String(els.min.value).trim() : "";
    var maxV = els.max ? String(els.max.value).trim() : "";
    if (minV === "" && maxV === "") {
      state.userCommitted = false;
      setRange(0, state.max, document.querySelector("[data-price-slider]"));
      state.lastWritten = "|";
    }
  }
  document.addEventListener("click", function (e) {
    if (!e.target.closest) return;
    if (e.target.closest("#clear-price") ||
        e.target.closest('.remove-filter[data-filter-name="price-range"]') ||
        e.target.closest("#clear-all-filters") ||
        e.target.closest("#clear-filters")) {
      setTimeout(resetFromInputs, 0);
    }
  }, true);

  function init() {
    var mounts = document.querySelectorAll("[data-price-slider]");
    if (!mounts.length) return;
    mounts.forEach(build);

    /* Track the dataset until it arrives, then keep watching for a REPLACED
       dataset (catalog retries). There is NO timeout that forces 0–0: a slow
       catalog keeps the current boundary, while a loaded-but-empty catalog
       (or empty category) produces 0–0 immediately on arrival. */
    var knownDataset = null;
    function trackDataset() {
      var list = window.NASSIM_PRODUCTS || window.allProducts || null;
      if (list === knownDataset) return;         // nothing new
      var m = computeMax();
      if (m == null) return;                     // still not usable — wait
      knownDataset = list;
      applyBoundary(m, true);
    }
    trackDataset();
    setInterval(trackDataset, 250);

    mounts.forEach(wireEvents);
    mounts.forEach(render);

    /* Debug/diagnostic hook (also lets QA inspect/force state from console). */
    window.NassimPriceSlider = {
      state: state,
      recompute: function () { knownDataset = null; trackDataset(); }
    };

    /* External changes to the hidden inputs (page Clear handlers etc.) sync
       back into the slider UI. */
    setInterval(function () {
      if (state.dragging) return;
      var els = hiddenInputs();
      if (!els.min) return;
      var sig = String(els.min.value).trim() + "|" + String(els.max.value).trim();
      if (sig === state.lastWritten) return;
      if (sig === "|") { setRange(0, state.max, document.querySelector("[data-price-slider]")); state.lastWritten = sig; return; }
      var a = parseFloat(els.min.value), b = parseFloat(els.max.value);
      if (!isNaN(a) && !isNaN(b)) { setRange(a, b, document.querySelector("[data-price-slider]")); state.lastWritten = sig; }
    }, 400);

    // touch-friendly drag flag
    document.addEventListener("pointerdown", function (e) {
      if (e.target.classList && e.target.classList.contains("nps-range")) state.dragging = true;
    }, true);
    document.addEventListener("pointerup", function () { state.dragging = false; }, true);
  }

  ready(init);
})();
