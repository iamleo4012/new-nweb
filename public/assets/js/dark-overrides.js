/**
 * AL-NASSIM Dark Mode Overrides Injector
 * Auto-injects the dark-overrides.css stylesheet into the page <head>.
 * Must load AFTER the Tailwind CDN script so it overrides the generated utilities.
 * Include before other nav scripts: <script src="assets/js/dark-overrides.js"></script>
 */
(function () {
  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "assets/css/dark-overrides.css";
  document.head.appendChild(link);
})();

/* ============================================================================
   BFCACHE RESTORE — centralized cleanup (all pages)
   ----------------------------------------------------------------------------
   Mobile browsers (Android Chrome, iPhone Safari) restore pages from the
   back/forward cache (bfcache) on Back navigation WITHOUT re-running scripts.
   Two kinds of state set before leaving would otherwise survive the restore and
   break the page:

   1. LOADING SCREEN — each page's `#loading-screen` is visible by default and
      hidden only by a `DOMContentLoaded` handler (which bfcache does NOT fire).
      On restore the overlay reappears covering the content and swallows taps.
   2. SCROLL LOCK — mobile-nav.js / account.js set `body.style.overflow = "hidden"`
      when a drawer/panel opens. If the user leaves while one is open, bfcache
      restores that inline style and the page is frozen. Android Chrome strictly
      enforces `overflow: hidden` (iOS Safari masks it), so this surfaces as an
      Android-only scroll freeze.

   `pageshow` fires on BOTH normal loads AND bfcache restores, so this single
   listener covers every page without editing each HTML file. It is defensive
   only — it removes overlay/lock state that should never persist; it never
   changes first-load behaviour. */
window.addEventListener("pageshow", function () {
  // 1. Never let the loading overlay stay up after a restore.
  var ls = document.getElementById("loading-screen");
  if (ls) { ls.style.opacity = "0"; ls.style.display = "none"; }

  // 2. Never let a scroll lock from a previously-open drawer/panel persist.
  if (document.body) document.body.style.overflow = "";
});

/* ============================================================================
   MOBILE HEADER — premium two-row layout injector (≤767px, all pages)
   ----------------------------------------------------------------------------
   Builds the Row-1 utility controls (Download App / EN|AR / Theme toggle) and
   inserts them into the existing mobile header. The search bar is moved to
   Row 2 purely by CSS (flex-wrap + 100% width) — see dark-overrides.css.

   Reuses (NO second implementations):
   - Theme toggle: built with id="theme-toggle", so theme.js auto-wires it and
     keeps its icon in sync with the desktop toggle (sun/moon swap).
   - Download icon: the same Material "download" glyph used in the desktop nav.
   - EN|AR: matches the desktop selector's look; persists the choice in
     localStorage('nassim-lang'). No translation engine exists yet, so the
     toggle only stores the preference (Arabic/RTL is a roadmap goal).
   - Search: untouched — the existing #mobile-inline-search form + search.js
     keep working; it just sits on Row 2.

   The hamburger (#hamburger-slot) is hidden from the header by CSS but kept in
   the DOM so mobile-nav.js and the bottom-nav Categories button keep working.
   ============================================================================ */
(function () {

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function isMobile() {
    return window.matchMedia("(max-width: 767px)").matches;
  }

  function buildUtils() {
    var row = document.createElement("div");
    row.id = "nassim-mobile-utils";

    // --- Download App (platform-aware) ---
    // The store apps are not published yet: the button stays (the owner wants
    // it visible) but tapping it explains the app is coming soon instead of
    // opening a dead placeholder store URL.
    var dl = document.createElement("button");
    dl.type = "button";
    dl.className = "nassim-mu-btn";
    dl.setAttribute("aria-label", "Our app is coming soon");
    dl.innerHTML = '<span class="material-symbols-outlined">download</span>';
    dl.addEventListener("click", function () { appComingSoon(); });
    row.appendChild(dl);

    /* --- EN | AR language selector: HIDDEN until Arabic actually exists ---
       The old button only stored a preference and reloaded the page with no
       visible effect, which reads as broken. Re-add it when the Arabic/RTL
       roadmap work (H-P02) ships. */

    // --- Theme toggle (reuses theme.js via id="theme-toggle") ---
    var theme = document.createElement("button");
    theme.type = "button";
    theme.id = "theme-toggle";                       // theme.js wires all #theme-toggle buttons
    theme.className = "nassim-mu-btn";
    theme.setAttribute("aria-label", "Toggle dark mode");
    // Icon set here; theme.js updateIcons() will correct it for the current mode.
    theme.innerHTML = '<span class="material-symbols-outlined">dark_mode</span>';
    row.appendChild(theme);

    return row;
  }

  /** Lightweight "coming soon" notice used by the app-download buttons. */
  function appComingSoon() {
    var t = document.getElementById("nassim-app-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "nassim-app-toast";
      t.style.cssText = "position:fixed;left:50%;bottom:5.5rem;transform:translateX(-50%);z-index:99999;background:#000308;color:#fff;font-size:12px;font-weight:700;letter-spacing:.06em;padding:.6rem 1.1rem;border-radius:.5rem;opacity:0;transition:opacity .25s ease;pointer-events:none;";
      t.textContent = "OUR APP IS COMING SOON";
      document.body.appendChild(t);
    }
    requestAnimationFrame(function () { t.style.opacity = "1"; });
    clearTimeout(appComingSoon._t);
    appComingSoon._t = setTimeout(function () { t.style.opacity = "0"; }, 2200);
  }

  function inject() {
    if (!isMobile()) return;
    if (document.getElementById("nassim-mobile-utils")) return; // already injected
    var nav = document.querySelector("nav.fixed.top-0");
    if (!nav) return;
    var container = nav.querySelector(".flex.justify-between");
    if (!container) return;
    // Insert the utility row right AFTER the logo group (the first child), so the
    // DOM order is [logo-group][mobile-utils][search]. With the search forced to
    // 100% width (CSS), row 1 = logo + utils, and the search wraps onto row 2.
    var logoGroup = container.querySelector("a[href=\"home.html\"]");
    var anchor = logoGroup ? logoGroup.parentElement : container.firstChild;
    container.insertBefore(buildUtils(), anchor ? anchor.nextSibling : null);
    // theme.js may have run before this button existed — re-trigger its init so
    // the new #theme-toggle gets wired + its icon synced to the current mode.
    if (typeof window.__nassimThemeInit === "function") {
      // Re-run theme icon sync by dispatching a storage event is heavy; instead,
      // call the public toggle twice trick is risky. Safer: theme.js init() is
      // idempotent and queries #theme-toggle fresh each run, but it isn't exposed.
      // So we manually wire the click as a fallback (theme.js also wires it; the
      // data-theme-wired guard prevents double-binding).
      var btn = container.querySelector("#theme-toggle:last-child");
      if (btn && btn.getAttribute("data-theme-wired") !== "1" && typeof window.__nassimThemeToggle === "function") {
        // theme.js init() will wire it on DOMContentLoaded; if that already fired,
        // wire it here as a guaranteed fallback.
        btn.addEventListener("click", function (e) {
          e.preventDefault(); e.stopPropagation();
          window.__nassimThemeToggle();
        });
        // Sync icon to current mode
        var isDark = document.documentElement.classList.contains("dark");
        var icon = btn.querySelector(".material-symbols-outlined");
        if (icon) icon.textContent = isDark ? "light_mode" : "dark_mode";
      }
    }
  }

  ready(inject);
  // Re-inject when crossing into the mobile breakpoint (e.g. desktop resize)
  var mq = window.matchMedia("(max-width: 767px)");
  if (mq.addEventListener) mq.addEventListener("change", function () { if (isMobile()) inject(); else { var e = document.getElementById("nassim-mobile-utils"); if (e) e.remove(); } });
  else if (mq.addListener) mq.addListener(function () { if (isMobile()) inject(); else { var e = document.getElementById("nassim-mobile-utils"); if (e) e.remove(); } });

  /* --- DESKTOP header language toggle ----------------------------------
     The shared desktop header renders an "EN | AR" button that was purely
     decorative (clicking it stored a preference and reloaded the page with
     no visible effect). Arabic/RTL does not exist yet (roadmap H-P02), so
     every such button is HIDDEN — on both desktop and mobile — until the
     real language switcher ships. Remove this routine when that happens. */
  function hideDesktopLangButtons() {
    document.querySelectorAll("nav button").forEach(function (btn) {
      if (btn.closest("#nassim-mobile-utils") || btn.hasAttribute("data-lang-hidden")) return;
      var spans = btn.querySelectorAll("span");
      var en = null, ar = null;
      spans.forEach(function (s) { var t = (s.textContent || "").trim(); if (t === "EN" && !en) en = s; if (t === "AR" && !ar) ar = s; });
      if (!en || !ar) return;
      btn.setAttribute("data-lang-hidden", "1");
      btn.style.display = "none";
    });
  }
  ready(hideDesktopLangButtons);
})();

/* ============================================================================
   MOBILE HEADER-HEIGHT SYNC — global, dynamic, no hard-coded pixels
   ----------------------------------------------------------------------------
   The fixed mobile header (<nav class="fixed w-full z-50 ... top-0">) is shared
   across every storefront page. Its rendered height varies (logo size + the
   injected utility row + the wrapped search bar) and was previously
   compensated by PAGE-SPECIFIC hard-coded paddings (pt-20/pt-32/pt-36) that
   didn't match reality → header overlapped first content on many pages.

   This ONE centralized routine (loaded on all 23 pages via dark-overrides.js):
   - Measures the real, live height of the fixed header (offsetHeight).
   - Publishes it as --mobile-header-height on <html>.
   - Re-measures on load, on every header resize (ResizeObserver), and on
     viewport/orientation changes (which re-wrap the header rows).
   - Clears the variable to 0 on desktop/tablet so no mobile padding leaks.
   The matching CSS in dark-overrides.css (mobile-only @media) sets
   scroll-padding-top + the page top spacing from this variable, so EVERY page
   begins exactly below the header with no overlap and no gap, and adapts
   automatically if the header ever changes height.
   ============================================================================ */
(function () {
  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(function () {
    var html = document.documentElement;
    // The fixed header is the first <nav> with .fixed on the page.
    var nav = document.querySelector("nav.fixed");

    function apply() {
      if (!nav) return;
      if (window.matchMedia("(max-width: 767px)").matches) {
        // offsetHeight includes the logo + utility row + wrapped search row,
        // i.e. the true on-screen header height the page content must clear.
        html.style.setProperty("--mobile-header-height", nav.offsetHeight + "px");
      } else {
        // Desktop/tablet: clear so no mobile-only padding leaks upward.
        html.style.setProperty("--mobile-header-height", "0px");
      }
    }

    // First useful measurement (header may still be settling; later passes refine).
    apply();
    // Re-measure once fonts/images/utility-row settle.
    window.addEventListener("load", apply);
    // Track any future header resize (responsive content, dynamic injection,
    // orientation change re-wrapping the search row).
    if (window.ResizeObserver && nav) {
      new ResizeObserver(apply).observe(nav);
    }
    // Re-evaluate mobile-vs-desktop branch on viewport/orientation changes.
    window.addEventListener("resize", apply, { passive: true });
    window.addEventListener("orientationchange", apply);
  });
})();

