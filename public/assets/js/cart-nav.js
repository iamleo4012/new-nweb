/**
 * AL-NASSIM Cart Navigation
 * Wires the cart/shopping_cart icon in the header to navigate to cart.html.
 * Include on every page: <script src="assets/js/cart-nav.js"></script>
 */
(function () {
  "use strict";
  function init() {
    var buttons = document.querySelectorAll("header button, nav button, header a, nav a");
    for (var i = 0; i < buttons.length; i++) {
      var icon = buttons[i].querySelector(".material-symbols-outlined");
      if (icon && icon.textContent.trim() === "shopping_cart") {
        var btn = buttons[i];
        if (btn.dataset.cartWired) continue;
        btn.dataset.cartWired = "1";
        btn.style.cursor = "pointer";
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          window.location.href = "cart.html";
        });
        break;
      }
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
