/* ============================================================================
   AL-NASSIM storefront — bilingual PRODUCT NAME display runtime
   ============================================================================
   Resolves the product display name for the visitor's selected site language
   (localStorage 'nassim-lang', owned by dark-overrides.js / i18n.js) and
   applies it with correct Unicode bidirectional handling.

   Behaviour:
     - EN (default): the English `name` is shown exactly as before.
     - AR: the Arabic `nameAr` is shown WHEN the product has one; products
       without an Arabic name gracefully keep their English name (never
       "undefined"/"null"/blank).
     - The stored product-name string is NEVER reversed or rearranged. When
       an Arabic name is shown, the container gets dir="rtl" (an HTML dir
       attribute is a bidi ISOLATION boundary), so the Arabic flows right to
       left while embedded Latin brand text and codes (ND-6223, ND- 2212,
       Al-nassim-ND-5733) keep their natural left-to-right character order
       via the Unicode bidi algorithm.
     - Elements this runtime filled are tracked; on 'nassim-langchange' they
       re-resolve, so toggling language updates already-rendered cards.

   API:
     NassimProductName.pick(p)        -> display string for current language
     NassimProductName.apply(el, p)   -> set textContent + bidi on el, track it
   ========================================================================== */
(function () {
  'use strict';
  if (window.NassimProductName) return;

  function lang() {
    try { return localStorage.getItem('nassim-lang') === 'ar' ? 'ar' : 'en'; }
    catch (e) { return 'en'; }
  }

  /* Non-empty Arabic name for the product, or '' (missing/blank/whitespace
     all fall back to English downstream — no undefined ever renders). */
  function arabicOf(p) {
    var a = p && p.nameAr;
    return (typeof a === 'string' && a.trim()) ? a : '';
  }

  function pick(p) {
    var en = p && p.name != null ? String(p.name) : '';
    if (lang() === 'ar') {
      var ar = arabicOf(p);
      if (ar) return ar;
    }
    return en;
  }

  var tracked = []; // { el, p } — re-resolved on language change

  function apply(el, p) {
    if (!el) return;
    var name = pick(p);
    el.textContent = name;
    /* dir="rtl" only for a REAL Arabic render; the attribute isolates the
       element's bidi context without reordering siblings or layout. */
    if (lang() === 'ar' && arabicOf(p) && /[\u0600-\u06FF]/.test(name)) {
      el.setAttribute('dir', 'rtl');
    } else if (el.hasAttribute('dir') && el.getAttribute('dir') === 'rtl') {
      el.removeAttribute('dir');
    }
    for (var i = 0; i < tracked.length; i++) {
      if (tracked[i].el === el) { tracked[i].p = p; return; }
    }
    tracked.push({ el: el, p: p });
  }

  window.addEventListener('nassim-langchange', function () {
    for (var i = 0; i < tracked.length; i++) {
      var rec = tracked[i];
      if (rec.el && rec.el.isConnected) apply(rec.el, rec.p);
    }
  });

  window.NassimProductName = { lang: lang, pick: pick, apply: apply };
})();
