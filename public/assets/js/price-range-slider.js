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
  /* DISPLAY + value format: whole KWD values stay whole ("0", "2"); any
     non-whole value shows exactly 3 decimals ("1.750", "0.250"). Numerically
     identical under parseFloat, so the filtering value never changes —
     1.75 renders "1.750" and filters as 1.75. */
  function fmt(v) {
    /* Approved display mechanism: below 9 KWD the price keeps its fils
       precision (e.g. "8.990"); from 9 KWD up only whole numbers are shown
       ("9", "1000"). Also drives the hidden-input writes, so the values the
       page filters by always match what the bubbles/boxes display. */
    var r = Math.round(v * 1000) / 1000;
    if (Math.abs(r) >= 0.0001) return String(Math.round(r));
    return r === Math.round(r) ? String(r) : r.toFixed(3);
  }

  /* Thousands separators for DISPLAY ONLY (bubbles): 1000 → "1,000".
     Never used for hidden-input writes — those must stay parseFloat-safe,
     and "1,000" would parse as 1. */
  function group(s) {
    return String(s).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  /* Dynamic DUAL boundary (min + max) from the CURRENT page/category product
     dataset. Pages expose their category via window.NASSIM_CATEGORY, so
     prices from other categories are never used.
     returns: { min, max } → max = CEIL of the highest valid price
                             (1.99→2, 2.1→3, 0.75→1, 4.9→5, 9→9);
                             min = FLOOR of the lowest valid price
                             (0.25→0, 1.45→1, 2.1→2, 9.9→9). min ≤ max.
                             max 0 = genuinely empty catalog → 0 KWD — 0 KWD.
              null       → dataset not available YET (never treated as empty) */
  function computeBoundary() {
    var list = window.NASSIM_PRODUCTS || window.allProducts || null;
    if (!list) return null;           // catalog not injected yet — keep waiting
    if (!list.length) return { min: 0, max: 0 };  // loaded but zero products
    if (window.NASSIM_CATEGORY) {
      list = list.filter(function (p) { return p && p.category === window.NASSIM_CATEGORY; });
    }
    var lo = Infinity, hi = 0, any = false;
    for (var i = 0; i < list.length; i++) {
      var v = parseFloat(list[i] && list[i].price);
      if (isNaN(v)) continue;
      any = true;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (!any) return { min: 0, max: 0 };
    var min = Math.floor(lo);
    var max = Math.ceil(hi);
    if (max < min) max = min;
    return { min: min, max: max };
  }

  /* Apply a freshly computed boundary. keepSelection preserves a committed
     APPLY range (clamped inside the new boundary); otherwise the selection
     follows the full min → max range. */
  function applyBoundary(b, keepSelection) {
    state.min = b.min;
    state.max = b.max;
    state.ready = true;
    if (!keepSelection || !state.userCommitted) {
      state.curMin = state.min;
      state.curMax = state.max;
    } else {
      state.curMin = Math.max(state.min, Math.min(state.curMin, state.max));
      state.curMax = Math.min(Math.max(state.curMax, state.curMin), state.max);
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
    /* Never overwrite an input the user is currently typing in — a formatted
       write-back mid-edit (e.g. after pausing at "1.") would destroy in-progress
       decimals. The user's raw text stays in place; the filtering value is the
       parsed number either way. lastWritten always reflects the ACTUAL input
       contents so the sync interval doesn't fight the user's edits. */
    if (els.min && document.activeElement !== els.min) els.min.value = min;
    if (els.max && document.activeElement !== els.max) els.max.value = max;
    state.lastWritten = (els.min ? String(els.min.value).trim() : "") + "|" + (els.max ? String(els.max.value).trim() : "");
  }

  function build(mount) {
    mount.dataset.npsInit = "1";
    /* Floating value bubbles sit ABOVE the track and follow their handles
       (positions computed in render()); the Min/Max input boxes above the
       slider remain the editable representation of the selected range. */
    mount.innerHTML =
      '<div class="nps">' +
        '<div class="nps-track-wrap">' +
          '<div class="nps-bubble nps-bubble-min"></div>' +
          '<div class="nps-bubble nps-bubble-max"></div>' +
          '<div class="nps-track"></div>' +
          '<div class="nps-fill"></div>' +
          '<input type="range" class="nps-range nps-range-min" aria-label="Minimum price"/>' +
          '<input type="range" class="nps-range nps-range-max" aria-label="Maximum price"/>' +
        '</div>' +
      '</div>';
  }

  /* Put the "KD" currency prefix INSIDE each Min/Max box: each input is
     wrapped in a positioned .nps-box with a non-interactive "KD" label, so
     the box reads as one display unit ("KD 1.750") while the input VALUE
     stays the plain number the existing page filter logic parses. */
  function decorateInputs() {
    ["price-min", "price-max"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || el.dataset.npsBox) return;
      el.dataset.npsBox = "1";
      var wrap = document.createElement("div");
      wrap.className = "nps-box";
      el.parentNode.insertBefore(wrap, el);
      wrap.appendChild(el);
      var kd = document.createElement("span");
      kd.className = "nps-box-kd";
      kd.textContent = "KD";
      wrap.insertBefore(kd, el);
    });
  }

  function qs(root, cls) { return root.querySelector(cls); }

  function render(root) {
    var st = state;
    var minR = qs(root, ".nps-range-min"), maxR = qs(root, ".nps-range-max");
    if (!st.ready) {
      /* Dataset not arrived yet: show a neutral loading state — never an
         invented maximum like 100. Handles are disabled and the manual
         inputs are left untouched until the real range is known. */
      minR.value = "0"; maxR.value = "0";
      minR.disabled = true; maxR.disabled = true;
      qs(root, ".nps-fill").style.left = "0%";
      qs(root, ".nps-fill").style.width = "0%";
      var bm0 = qs(root, ".nps-bubble-min"), bm1 = qs(root, ".nps-bubble-max");
      if (bm0) bm0.style.visibility = "hidden";
      if (bm1) bm1.style.visibility = "hidden";
      return;
    }
    var bvis0 = qs(root, ".nps-bubble-min"), bvis1 = qs(root, ".nps-bubble-max");
    if (bvis0) bvis0.style.visibility = "";
    if (bvis1) bvis1.style.visibility = "";
    minR.disabled = false; maxR.disabled = false;
    minR.min = String(st.min); minR.max = String(st.max); minR.step = String(STEP); minR.value = String(st.curMin);
    maxR.min = String(st.min); maxR.max = String(st.max); maxR.step = String(STEP); maxR.value = String(st.curMax);
    /* Fill band: LTR anchors it at the physical left; RTL anchors it at the
       physical RIGHT. The native range inputs already render their thumbs
       mirrored under direction:rtl (right = min side, left = max side), so
       only this fill calculation needs the direction-aware coordinate. The
       VALUES never change: curMin <= curMax in both directions. */
    var trackWrap = qs(root, ".nps-track-wrap");
    var rtl = trackWrap && getComputedStyle(trackWrap).direction === "rtl";
    var range = (st.max - st.min) || 1;
    var loFrac = (st.curMin - st.min) / range;
    var hiFrac = (st.curMax - st.min) / range;
    var startFrac = rtl ? 1 - hiFrac : loFrac;
    qs(root, ".nps-fill").style.left = (startFrac * 100) + "%";
    qs(root, ".nps-fill").style.width = (Math.abs(hiFrac - loFrac) * 100) + "%";
    /* The page's visible Min/Max inputs (above the slider) mirror the live
       values unless the user is typing in them */
    var minIn = document.getElementById("price-min"), maxIn = document.getElementById("price-max");
    if (document.activeElement !== minIn && minIn) minIn.value = fmt(st.curMin);
    if (document.activeElement !== maxIn && maxIn) maxIn.value = fmt(st.curMax);
    /* Floating value bubbles: one per handle, showing ONLY the number (no
       currency), centered above its handle and following it while dragging —
       LTR and mirrored RTL alike. When the handles get close, the bubbles
       are pushed apart around the pair's midpoint so they can never overlap
       or leave the track. */
    var bubbleMin = qs(root, ".nps-bubble-min"), bubbleMax = qs(root, ".nps-bubble-max");
    if (bubbleMin && bubbleMax && trackWrap && st.ready) {
      var trackW = trackWrap.clientWidth || 0;
      bubbleMin.textContent = group(fmt(st.curMin));
      bubbleMax.textContent = group(fmt(st.curMax));
      var wMin = bubbleMin.offsetWidth || 36, wMax = bubbleMax.offsetWidth || 36;
      var cMin = (rtl ? 1 - loFrac : loFrac) * trackW;
      var cMax = (rtl ? 1 - hiFrac : hiFrac) * trackW;
      /* Direction-agnostic overlap guard: in RTL the max handle's centre sits
         LEFT of the min's, so compare distances, not cMax > cMin. When the
         handles are closer than the bubbles' combined half-widths, push the
         pair apart around their midpoint (same side ordering as the handles),
         then keep every bubble inside the track. */
      var minDist = (wMin + wMax) / 2 + 6;
      var d = cMax - cMin;
      if (Math.abs(d) < minDist) {
        var mid = (cMin + cMax) / 2;
        var sgn = d >= 0 ? 1 : -1;
        cMin = mid - sgn * minDist / 2;
        cMax = mid + sgn * minDist / 2;
      }
      var edge = Math.min(wMin, wMax) / 2;
      cMin = Math.max(edge, Math.min(trackW - edge, cMin));
      cMax = Math.max(edge, Math.min(trackW - edge, cMax));
      if (Math.abs(cMax - cMin) < minDist) {
        var mid2 = (cMin + cMax) / 2;
        cMin = mid2 - sgn * minDist / 2;
        cMax = mid2 + sgn * minDist / 2;
        cMin = Math.max(0, Math.min(trackW, cMin));
        cMax = Math.max(0, Math.min(trackW, cMax));
      }
      bubbleMin.style.left = cMin + "px";
      bubbleMax.style.left = cMax + "px";
    }
  }

  function setRange(a, b, root) {
    var min = state.min, max = state.max;
    a = Math.max(min, Math.min(max, a));
    b = Math.max(min, Math.min(max, b));
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
        a = Math.max(state.min, Math.min(state.max, a));
        b = Math.max(state.min, Math.min(state.max, b));
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

  /* MANUAL Min/Max AUTO-APPLY: the APPLY button is hidden from the UI, so
     manual entry must commit on its own. Everything routes through the
     EXISTING pipeline — the hidden #apply-price click -> capture handler
     (clamps to the dynamic range, enforces Min<=Max, writes the hidden
     inputs) -> the page's own filter logic. Typing is debounced so a value
     applies once it settles; blur/Enter apply immediately. A value that
     doesn't parse as a number yet (half-typed) is ignored, never applied. */
  var manualTimer = null;
  function manualCommit() {
    if (manualTimer) { clearTimeout(manualTimer); manualTimer = null; }
    var btn = document.getElementById("apply-price");
    if (btn) btn.click();
  }
  document.addEventListener("input", function (e) {
    var t = e.target;
    if (!t || (t.id !== "price-min" && t.id !== "price-max")) return;
    var raw = String(t.value).trim();
    /* Skip while the text is not a complete number yet: empty (user cleared
       the box to retype) or ending with the decimal separator ("1.", "0.").
       Applying those mid-edit would truncate the decimals they are about to
       type. Everything else numeric — including 3-decimal KD values — applies
       after the debounce. */
    if (raw === "" || /\.$/.test(raw) || isNaN(parseFloat(raw))) return;
    if (manualTimer) clearTimeout(manualTimer);
    manualTimer = setTimeout(function () { manualTimer = null; manualCommit(); }, 600);
  });
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (!t || (t.id !== "price-min" && t.id !== "price-max")) return;
    var raw = String(t.value).trim();
    if (raw !== "" && isNaN(parseFloat(raw))) return;   // invalid — wait
    manualCommit();                                     // blur/Enter commit
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
      setRange(state.min, state.max, document.querySelector("[data-price-slider]"));
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
    decorateInputs();

    /* Track the dataset until it arrives, then keep watching for a REPLACED
       dataset (catalog retries). There is NO timeout that forces 0–0: a slow
       catalog keeps the current boundary, while a loaded-but-empty catalog
       (or empty category) produces 0–0 immediately on arrival. */
    var knownDataset = null;
    function trackDataset() {
      var list = window.NASSIM_PRODUCTS || window.allProducts || null;
      if (list === knownDataset) return;         // nothing new
      var bnd = computeBoundary();
      if (bnd == null) return;                   // still not usable — wait
      knownDataset = list;
      applyBoundary(bnd, true);
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
      if (sig === "|") { setRange(state.min, state.max, document.querySelector("[data-price-slider]")); state.lastWritten = sig; return; }
      var a = parseFloat(els.min.value), b = parseFloat(els.max.value);
      if (!isNaN(a) && !isNaN(b)) { setRange(a, b, document.querySelector("[data-price-slider]")); state.lastWritten = sig; }
    }, 400);

    // touch-friendly drag flag
    document.addEventListener("pointerdown", function (e) {
      if (e.target.classList && e.target.classList.contains("nps-range")) state.dragging = true;
    }, true);
    document.addEventListener("pointerup", function () { state.dragging = false; }, true);

    /* Keep the floating bubbles glued to their handles across layout shifts
       (sidebar drawer open/close, viewport rotation/resize, font swap). */
    var resizeTimer = null;
    window.addEventListener("resize", function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        document.querySelectorAll("[data-price-slider]").forEach(render);
      }, 120);
    });
  }

  ready(init);
})();
