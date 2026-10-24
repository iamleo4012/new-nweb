/* ========================================================================
   NASSIM Filter sidebar accordion DEFAULT STATE (shared across listing pages)
   ------------------------------------------------------------------------
   ALL WIDTHS: the Price Range / Color / Unit filter sections start OPEN so
   customers see every filter value immediately (no hidden-behind-the-arrow
   sections). Other sections keep their authored state. Collapse/expand by
   tapping a section header still works as before.
   Pure presentation: no filter inputs, logic, or data are touched.
   ======================================================================== */
(function () {
  "use strict";

  var DESKTOP_OPEN_PREFIXES = ["price range", "color", "unit"];

  function isMobile() {
    return window.matchMedia("(max-width: 767px), (orientation: portrait)").matches;
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
      /* ALL widths: the main filter sections start OPEN so customers see the
         values immediately instead of having to find the arrow. Collapse is
         still available by tapping the section header. */
      if (shouldOpenOnDesktop(d)) {
        d.open = true;
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
