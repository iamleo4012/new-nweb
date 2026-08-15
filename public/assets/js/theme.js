/**
 * AL-NASSIM Global Theme Controller
 * ============================================================================
 * SINGLE source of truth for dark/light theme across the entire website.
 *
 * Responsibilities:
 *   1. Apply the saved theme BEFORE first paint (called inline in <head>)
 *   2. Wire the theme toggle button on every page
 *   3. Sync theme across browser tabs via 'storage' event
 *   4. Persist theme in localStorage('color-theme')
 * ============================================================================
 */

// ---- Phase 1: Inline init (runs in <head> before body renders) ----
function __nassimThemeInit() {
  try {
    var saved = localStorage.getItem("color-theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var isDark = saved === "dark" || (!saved && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
  } catch (e) {
    document.documentElement.classList.add("light");
  }
}

// ---- Phase 2: Full controller (loaded after DOM) ----
(function () {
  "use strict";

  var ICON_SELECTOR = '#theme-toggle .material-symbols-outlined';
  var BTN_SELECTOR = '#theme-toggle';

  function updateIcons(isDark) {
    var icons = document.querySelectorAll(ICON_SELECTOR);
    for (var i = 0; i < icons.length; i++) {
      icons[i].textContent = isDark ? 'light_mode' : 'dark_mode';
    }
  }

  function applyTheme(isDark) {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
    try { localStorage.setItem('color-theme', isDark ? 'dark' : 'light'); } catch (e) {}
    updateIcons(isDark);
  }

  function isDark() {
    return document.documentElement.classList.contains('dark');
  }

  function toggleTheme() {
    applyTheme(!isDark());
  }

  function init() {
    if (!document.documentElement.classList.contains('dark') && !document.documentElement.classList.contains('light')) {
      __nassimThemeInit();
    }
    updateIcons(isDark());

    var btns = document.querySelectorAll(BTN_SELECTOR);
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      if (btn.getAttribute('data-theme-wired') === '1') continue;
      btn.setAttribute('data-theme-wired', '1');
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleTheme();
      });
    }

    window.addEventListener('storage', function (e) {
      if (e.key === 'color-theme') {
        var dark = e.newValue === 'dark';
        document.documentElement.classList.toggle('dark', dark);
        document.documentElement.classList.toggle('light', !dark);
        updateIcons(dark);
      }
    });
  }

  window.__nassimThemeToggle = toggleTheme;
  window.__nassimThemeInit = __nassimThemeInit;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
