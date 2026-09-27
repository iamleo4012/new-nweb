/* ========================================================================
   NASSIM Filter sidebar accordion DEFAULT STATE (shared across listing pages)
   ------------------------------------------------------------------------
   DESKTOP (≥768px): Price Range / Color / Unit accordions start OPEN so the
   customer sees every filter value immediately. Other sections keep their
   authored state. Collapse/expand still works as before.
   MOBILE (≤767px): ALL sidebar accordions start CLOSED (the customer taps a
   section to open it). The state is applied per viewport, so resizing or
   rotating re-evaluates instead of carrying one fixed state over.
   Pure presentation: no filter inputs, logic, or data are touched.
   ======================================================================== */
(function () {
  "use strict";

  var DESKTOP_OPEN_PREFIXES = ["price range", "color", "unit"];

  function isMobile() {
    return window.matchMedia("(max-width: 767px)").matches;
  }

  function headerText(details) {
    var h = details.querySelector("summary h3, summary h2, summary span");
    return h ? h.textContent.trim().toLowerCase() : "";
  }

  function shouldOpenOnDesktop(details) {
    var t = headerText(details);
    return DESKTOP_OPEN_PREFIXES.some(function (p) { return t.indexOf(p) === 0; });
  }

  function apply() {
    var sidebar = document.querySelector(".subcat-sidebar");
    if (!sidebar) return;
    sidebar.querySelectorAll("details").forEach(function (d) {
      if (isMobile()) {
        d.open = false; // mobile: everything closed until tapped
      } else if (shouldOpenOnDesktop(d)) {
        d.open = true; // desktop: Price Range / Color / Unit open
      }
    });
  }

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(function () {
    apply();
    var t = null;
    window.addEventListener("resize", function () {
      clearTimeout(t); t = setTimeout(apply, 150);
    });
  });
})();
