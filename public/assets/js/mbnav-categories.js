/* Mobile bottom-nav "Categories" label — AR swap (2026-10-13).
   Scoped to the #mbnav-categories-label span in the fixed bottom nav ONLY:
   the shared i18n system, headers, drawers, footers and every other
   "Categories" wording on every page keep their existing text.

   The Arabic value now comes from the SHARED i18n map
   (assets/js/i18n-data.js, key "categories") so it can be edited in one
   place; the span's data-ar attribute is only a fallback when the map or
   the key is missing. */
(function () {
  "use strict";
  function boot() {
    var el = document.getElementById('mbnav-categories-label');
    if (!el) return;
    function storedLang() {
      try { return localStorage.getItem('nassim-lang') === 'ar' ? 'ar' : 'en'; }
      catch (e) { return 'en'; }
    }
    function apply(lang) {
      var t;
      if (lang === 'ar') {
        t = (window.NASSIM_I18N && window.NASSIM_I18N['categories']) || el.getAttribute('data-ar');
      } else {
        t = el.getAttribute('data-en') || 'Categories';
      }
      if (t && el.textContent !== t) el.textContent = t;
    }
    apply(document.documentElement.classList.contains('lang-ar') ? 'ar' : storedLang());
    var onLang = function (e) {
      apply(e && e.detail && e.detail.lang ? e.detail.lang : storedLang());
    };
    window.addEventListener('nassim-langchange', onLang);
    document.addEventListener('nassim-langchange', onLang);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
