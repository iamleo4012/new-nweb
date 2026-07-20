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
