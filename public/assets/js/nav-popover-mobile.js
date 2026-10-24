/**
 * AL-NASSIM shared top-nav — mobile positioning for the "DOWNLOAD OUR APP"
 * popover (pairs with nav-popover-mobile.css, mobile media scope only).
 *
 * The popover is absolutely positioned against the fixed nav. This script
 * reads the download icon's real bounding rectangle and sets the panel's
 * inline left/right so the panel opens visually connected to the icon while
 * staying fully inside the viewport (12px safe margin) — even on 320px
 * screens where the nav row itself can overflow. Desktop (>=768px landscape)
 * is untouched: the positioner no-ops there and the CSS fallback values in
 * nav-popover-mobile.css never apply outside the mobile media query.
 *
 * The icon-to-nav offset is constant while the nav is fixed, so the panel is
 * positioned once on load, on resize, and on orientation change. Open/close
 * behavior (hover/tap + outside click) is pure CSS and unchanged.
 */
(function () {
  "use strict";

  var MOBILE_MQ = "(max-width: 767px), (orientation: portrait)";
  var MARGIN = 12;

  function position() {
    try {
      if (!window.matchMedia(MOBILE_MQ).matches) return;
      var nav = document.querySelector("nav.glass-nav");
      var btn = document.getElementById("download-btn");
      var pop = document.getElementById("download-popup");
      if (!nav || !btn || !pop) return;
      var nr = nav.getBoundingClientRect();
      var br = btn.getBoundingClientRect();
      var vw = document.documentElement.clientWidth;
      if (!vw) return;
      var rtl = document.documentElement.classList.contains("lang-ar");
      // Important-priority inline styles: the measured position must win over
      // the CSS fallback values in nav-popover-mobile.css (which carry
      // !important for the no-JS case).
      if (rtl) {
        pop.style.setProperty("right", "auto", "important");
        var leftViewport = MARGIN; /* hug edge: less overlap with centered content */
        pop.style.setProperty("left", Math.max(leftViewport - nr.left, 0).toFixed(1) + "px", "important");
      } else {
        pop.style.setProperty("left", "auto", "important");
        var rightViewport = vw - MARGIN; /* hug edge: less overlap with centered content */
        var rightNavSpace = rightViewport - nr.left; // nav-local coordinate
        var rightOffset = Math.max(MARGIN, (nr.left + nr.width) - rightViewport);
        pop.style.setProperty("right", Math.max(rightOffset, 0).toFixed(1) + "px", "important");
      }
      // Aim the upward caret at the download icon: caret center = icon center
      // expressed as an offset from the panel's left edge (post-positioning).
      var pr = pop.getBoundingClientRect();
      var caretX = (br.left + br.right) / 2 - pr.left;
      var caretMin = 16, caretMax = Math.max(pr.width - 16, caretMin);
      pop.style.setProperty("--pop-caret-x", Math.min(Math.max(caretX, caretMin), caretMax).toFixed(1) + "px");
    } catch (e) { /* never break the page over positioning */ }
  }

  function init() {
    position();
    // The header compression engine (nav h5-engine) reflows the nav after
    // first paint; re-aim the caret once it settles.
    setTimeout(position, 150);
    setTimeout(position, 400);
    window.addEventListener('load', function () { setTimeout(position, 100); });
    window.addEventListener("resize", position);
    window.addEventListener("orientationchange", function () { setTimeout(position, 250); });
    // The popover is visibility-hidden while closed, so the i18n runtime's
    // walker (renderedText requires visible client rects) never translates
    // its heading. When the popover opens (tap/hover/focus) in Arabic, ask
    // the runtime to re-apply — idempotent, ledger-guarded.
    var container = document.getElementById('download-btn-container');
    if (container && window.NassimI18n) {
      var reapply = function () {
        if (window.NassimI18n.lang === 'ar') setTimeout(function () { window.NassimI18n.reapply(); }, 0);
      };
      ['mouseenter', 'click', 'touchstart', 'focusin'].forEach(function (ev) {
        container.addEventListener(ev, reapply, { passive: true });
      });
    }
    // Language switch toggles html.lang-ar and reloads, but re-position on the
    // class change too just in case a future toggle becomes dynamic.
    new MutationObserver(position).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
