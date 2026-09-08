/**
 * AL-NASSIM Account System (server-backed)
 * ============================================================================
 * Slide-in auth panel: Sign In, Sign Up, Forgot Password, Profile, Edit
 * Profile, and My Orders. Backed by the real API (/api/auth/*, /api/orders)
 * with httpOnly JWT session cookies — no credentials stored in the browser.
 *
 * Include on every page: <script src="assets/js/account.js"></script>
 * The script auto-injects the panel HTML into the page.
 * ============================================================================
 */
(function () {
  "use strict";

  // Remove legacy localStorage auth state (previously stored plaintext passwords).
  try { localStorage.removeItem("nassim_auth"); } catch (e) {}

  var currentUser = null;

  // ===== Local-data ownership marker =====
  // localStorage cart/wishlist keys (nassim_cart / nassim_wishlist) are shared
  // by every account that uses this browser. This marker records WHICH user
  // the local snapshot belongs to, so that switching accounts (without logout)
  // never merges one account's items into another account's cart/wishlist.
  var OWNER_KEY = "nassim_data_owner";
  function getStoredOwner() { try { return localStorage.getItem(OWNER_KEY) || ""; } catch (e) { return ""; } }
  function setStoredOwner(id) { try { localStorage.setItem(OWNER_KEY, String(id)); } catch (e) {} }
  function clearStoredOwner() { try { localStorage.removeItem(OWNER_KEY); } catch (e) {} }

  function normalizeUser(u) {
    if (!u) return null;
    return {
      id: u.id,
      fullName: u.name || "",
      email: u.email || "",
      phone: u.phone || "",
      role: u.role || "CUSTOMER",
      // Admin-panel entry points. Staff accounts manage orders only, so the
      // storefront links them to the dashboard and orders — not products.
      isAdmin: u.role === "ADMIN" || u.role === "STAFF",
      isFullAdmin: u.role === "ADMIN"
    };
  }

  function getCurrentUser() { return currentUser; }

  /**
   * After login, merge any GUEST cart items (localStorage) into the server
   * cart, then restore the full server cart + wishlist into localStorage so
   * the storefront displays them. Never lose products.
   *
   * Account-isolation guard: if the localStorage snapshot is marked as
   * belonging to a DIFFERENT account (account switch without logout), those
   * items are NOT guest items — they are the other account's leftovers and
   * must never be merged into this account. They are discarded locally (the
   * other account still has its own server-side copy) and replaced with this
   * account's server data.
   */
  function mergeGuestCart() {
    try {
      var ownerId = currentUser ? String(currentUser.id) : "";
      var localFromOtherAccount = ownerId !== "" && getStoredOwner() !== "" && getStoredOwner() !== ownerId;
      var guestItems = [];
      if (localFromOtherAccount) {
        // Drop the previous account's local snapshot — its real cart/wishlist
        // live on the server under that account and are untouched.
        localStorage.setItem("nassim_cart", JSON.stringify({ state: { items: [], shipping: 2.5, currency: "KD" } }));
        localStorage.setItem("nassim_wishlist", JSON.stringify({ state: { items: [] } }));
      } else {
        var raw = localStorage.getItem("nassim_cart");
        var parsed = raw ? JSON.parse(raw) : null;
        guestItems = parsed && parsed.state ? parsed.state.items : (parsed && parsed.items ? parsed.items : []);
      }
      // Send each guest cart item to the server cart API (merge)
      var mergePromises = (guestItems || []).map(function (item) {
        return fetch("/api/cart", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: item.id || item.slug, quantity: item.quantity || 1 })
        }).catch(function () { return null; });
      });
      Promise.all(mergePromises).then(function () {
        // After merge, fetch the full server cart and write to localStorage
        fetch("/api/cart", { credentials: "same-origin" })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d.success && d.data && d.data.items) {
              var items = d.data.items.map(function (i) {
                var p = i.product || {};
                return {
                  id: i.id || p.slug || i.slug || "",
                  name: i.name || p.name || "",
                  image: i.image || p.image || "",
                  price: Number(i.price || p.price || 0),
                  currency: i.currency || p.currency || "KD",
                  line: i.line || p.line || "",
                  sku: i.sku || p.sku || "",
                  quantity: i.quantity || 1
                };
              });
              localStorage.setItem("nassim_cart", JSON.stringify({ state: { items: items, shipping: 2.5, currency: "KD" } }));
            }
            if (ownerId) setStoredOwner(ownerId);
            if (window.NassimCartBadge) window.NassimCartBadge.update();
          })
          .catch(function () { if (window.NassimCartBadge) window.NassimCartBadge.update(); });
        // Also restore server wishlist into localStorage
        fetch("/api/wishlist", { credentials: "same-origin" })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d.success && d.data && d.data.items) {
              var wishItems = d.data.items.map(function (i) {
                var p = i.product || {};
                return {
                  id: i.id || p.slug || i.slug || "",
                  name: i.name || p.name || "",
                  image: i.image || p.image || "",
                  price: Number(i.price || p.price || 0),
                  currency: i.currency || p.currency || "KD",
                  line: i.line || p.line || "",
                  sku: i.sku || p.sku || ""
                };
              });
              localStorage.setItem("nassim_wishlist", JSON.stringify({ state: { items: wishItems } }));
            }
          })
          .catch(function () {});
      });
    } catch (e) { /* Fail silently — cart merge is best-effort */ }
  }

  function refreshSession() {
    return fetch("/api/auth/me", { credentials: "same-origin" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.success && data.data && data.data.user) {
          currentUser = normalizeUser(data.data.user);
        } else {
          currentUser = null; // Guest mode — not an error
        }
        updateAccountButton();
        return currentUser;
      })
      .catch(function () { currentUser = null; updateAccountButton(); return null; });
  }

  function apiPost(url, body) {
    return fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); });
  }

  // ===== Panel HTML (injected into the page) =====
  var PANEL_HTML = '\
<div id="auth-backdrop" class="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm opacity-0 invisible transition-opacity duration-300"></div>\
<div id="auth-panel" class="fixed top-0 right-0 h-full w-full md:w-[400px] bg-surface dark:bg-[#0a0f14] shadow-2xl z-[201] translate-x-full opacity-0 invisible pointer-events-none transition-transform duration-400 flex flex-col">\
  <button id="auth-close" class="absolute top-5 right-5 z-10 w-9 h-9 flex items-center justify-center text-on-surface-variant dark:text-white/70 hover:text-secondary transition-colors"><span class="material-symbols-outlined">close</span></button>\
  <div id="auth-content" class="flex-1 overflow-y-auto"></div>\
</div>';

  // ===== View renderers =====
  function renderSignIn() {
    return '\
<div class="nassim-auth-view px-8 pt-8 pb-8 flex flex-col h-full" style="animation: fade-in 0.3s ease-out;">\
  <h2 class="font-display text-3xl font-extrabold text-primary dark:text-white uppercase tracking-tight mb-2">Welcome Back</h2>\
  <p class="font-body text-sm text-on-surface-variant dark:text-white/70 mb-8">Sign in to your AL-NASSIM account.</p>\
  <form id="signin-form" class="space-y-5" novalidate>\
    <div><label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-white/70 font-bold mb-2 block">Email Address</label><input id="signin-email" type="email" required class="w-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 dark:border-outline-variant/50 text-on-surface dark:text-white text-sm px-4 py-3.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary" placeholder="you@example.com"></div>\
    <div><label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-white/70 font-bold mb-2 block">Password</label><div class="relative"><input id="signin-password" type="password" required class="w-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 dark:border-outline-variant/50 text-on-surface dark:text-white text-sm px-4 py-3.5 pr-12 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary" placeholder="********"><button type="button" onclick="var el=document.getElementById(\'signin-password\');el.type=el.type===\'password\'?\'text\':\'password\';this.querySelector(\'.material-symbols-outlined\').textContent=el.type===\'password\'?\'visibility\':\'visibility_off\'" class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-white/50 hover:text-secondary transition-colors"><span class="material-symbols-outlined text-lg">visibility</span></button></div></div>\
    <div class="flex items-center justify-between"><label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="signin-remember" class="w-4 h-4 accent-secondary"><span class="font-label text-xs text-on-surface-variant dark:text-white/70">Remember Me</span></label><button type="button" onclick="NassimAccount.showView(\'forgot\')" class="font-label text-xs text-secondary hover:underline">Forgot Password?</button></div>\
    <div id="signin-error" class="hidden text-xs text-error font-bold"></div>\
    <button type="submit" id="signin-submit" class="w-full bg-primary text-on-primary py-4 font-headline text-xs font-black uppercase tracking-[0.2em] rounded-sm hover:bg-secondary transition-all">Sign In</button>\
  </form>\
  <p class="text-center font-label text-xs text-on-surface-variant dark:text-white/70 mt-6">Don\'t have an account? <button onclick="NassimAccount.showView(\'signup\')" class="text-secondary font-bold hover:underline">Sign Up</button></p>\
</div>';
  }

  function renderSignUp() {
    return '\
<div class="nassim-auth-view px-8 pt-8 pb-8 flex flex-col h-full" style="animation: fade-in 0.3s ease-out;">\
  <h2 class="font-display text-3xl font-extrabold text-primary dark:text-white uppercase tracking-tight mb-2">Create Account</h2>\
  <p class="font-body text-sm text-on-surface-variant dark:text-white/70 mb-6">Join the AL-NASSIM collection.</p>\
  <form id="signup-form" class="space-y-4" novalidate>\
    <div><label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-white/70 font-bold mb-2 block">Full Name</label><input id="su-name" type="text" required class="w-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 dark:border-outline-variant/50 text-on-surface dark:text-white text-sm px-4 py-3.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary" placeholder="Your full name"></div>\
    <div><label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-white/70 font-bold mb-2 block">Email Address</label><input id="su-email" type="email" required class="w-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 dark:border-outline-variant/50 text-on-surface dark:text-white text-sm px-4 py-3.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary" placeholder="you@example.com"></div>\
    <div><label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-white/70 font-bold mb-2 block">Phone Number</label><input id="su-phone" type="tel" class="w-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 dark:border-outline-variant/50 text-on-surface dark:text-white text-sm px-4 py-3.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary" placeholder="+965 6000 0000"></div>\
    <div><label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-white/70 font-bold mb-2 block">Password</label><div class="relative"><input id="su-password" type="password" required class="w-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 dark:border-outline-variant/50 text-on-surface dark:text-white text-sm px-4 py-3.5 pr-12 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary" placeholder="At least 8 characters"><button type="button" onclick="var el=document.getElementById(\'su-password\');el.type=el.type===\'password\'?\'text\':\'password\';this.querySelector(\'.material-symbols-outlined\').textContent=el.type===\'password\'?\'visibility\':\'visibility_off\'" class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-white/50 hover:text-secondary transition-colors"><span class="material-symbols-outlined text-lg">visibility</span></button></div></div>\
    <div><label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-white/70 font-bold mb-2 block">Confirm Password</label><div class="relative"><input id="su-confirm" type="password" required class="w-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 dark:border-outline-variant/50 text-on-surface dark:text-white text-sm px-4 py-3.5 pr-12 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary" placeholder="Re-enter password"><button type="button" onclick="var el=document.getElementById(\'su-confirm\');el.type=el.type===\'password\'?\'text\':\'password\';this.querySelector(\'.material-symbols-outlined\').textContent=el.type===\'password\'?\'visibility\':\'visibility_off\'" class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-white/50 hover:text-secondary transition-colors"><span class="material-symbols-outlined text-lg">visibility</span></button></div></div>\
    <div id="signup-error" class="hidden text-xs text-error font-bold"></div>\
    <button type="submit" id="signup-submit" class="w-full bg-primary text-on-primary py-4 font-headline text-xs font-black uppercase tracking-[0.2em] rounded-sm hover:bg-secondary transition-all">Create Account</button>\
  </form>\
  <p class="text-center font-label text-xs text-on-surface-variant dark:text-white/70 mt-6">Already have an account? <button onclick="NassimAccount.showView(\'signin\')" class="text-secondary font-bold hover:underline">Sign In</button></p>\
</div>';
  }

  function renderForgot() {
    return '\
<div class="nassim-auth-view px-8 pt-8 pb-8 flex flex-col h-full" style="animation: fade-in 0.3s ease-out;">\
  <h2 class="font-display text-3xl font-extrabold text-primary dark:text-white uppercase tracking-tight mb-2">Reset Password</h2>\
  <p class="font-body text-sm text-on-surface-variant dark:text-white/70 mb-8">Enter your email and we\'ll send you reset instructions.</p>\
  <form id="forgot-form" class="space-y-5" novalidate>\
    <div><label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-white/70 font-bold mb-2 block">Email Address</label><input id="forgot-email" type="email" required class="w-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 dark:border-outline-variant/50 text-on-surface dark:text-white text-sm px-4 py-3.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary" placeholder="you@example.com"></div>\
    <p id="forgot-error" class="hidden text-sm text-red-600 dark:text-red-400 font-body"></p>\
    <button type="submit" id="forgot-submit" class="w-full bg-primary text-on-primary py-4 font-headline text-xs font-black uppercase tracking-[0.2em] rounded-sm hover:bg-secondary transition-all">Continue</button>\
  </form>\
  <p class="text-center font-label text-xs text-on-surface-variant dark:text-white/70 mt-6">Remembered it? <button onclick="NassimAccount.showView(\'signin\')" class="text-secondary font-bold hover:underline">Back to Sign In</button></p>\
</div>';
  }

  function renderProfile(user) {
    var initial = (user.fullName || "?").charAt(0).toUpperCase();
    var isAdmin = user.isAdmin === true;
    var isFullAdmin = user.isFullAdmin === true;
    var menuItems = "";
    if (isAdmin) {
      // Staff see the dashboard and order management links; the Product
      // Management link is admin-only (the products tab rejects staff).
      var productItem = isFullAdmin
        ? '<a href="/admin/products" class="w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-container dark:hover:bg-surface-container-high transition-colors text-left"><span class="material-symbols-outlined text-xl text-on-surface-variant dark:text-white/70">inventory_2</span><span class="font-headline text-sm font-bold text-on-surface dark:text-white">Product Management</span><span class="material-symbols-outlined text-lg text-on-surface-variant/40 ml-auto">chevron_right</span></a>'
        : "";
      menuItems = '\
      <a href="/admin" class="w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-container dark:hover:bg-surface-container-high transition-colors text-left"><span class="material-symbols-outlined text-xl text-on-surface-variant dark:text-white/70">dashboard</span><span class="font-headline text-sm font-bold text-on-surface dark:text-white">Go to Dashboard</span><span class="material-symbols-outlined text-lg text-on-surface-variant/40 ml-auto">chevron_right</span></a>\
      ' + productItem + '<a href="/admin/orders" class="w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-container dark:hover:bg-surface-container-high transition-colors text-left"><span class="material-symbols-outlined text-xl text-on-surface-variant dark:text-white/70">receipt_long</span><span class="font-headline text-sm font-bold text-on-surface dark:text-white">Orders Management</span><span class="material-symbols-outlined text-lg text-on-surface-variant/40 ml-auto">chevron_right</span></a>\
      <button onclick="NassimAccount.showView(\'edit-profile\')" class="nassim-account-item w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-container dark:hover:bg-transparent transition-colors text-left group/account"><span class="material-symbols-outlined text-xl text-on-surface-variant dark:text-white/70 transition-colors duration-200 group-hover/account:text-secondary">person</span><span class="font-headline text-sm font-bold text-on-surface dark:text-white transition-all duration-200 group-hover/account:text-secondary group-hover/account:font-extrabold">Edit Profile</span><span class="material-symbols-outlined text-lg text-on-surface-variant/40 ml-auto transition-colors duration-200 group-hover/account:text-secondary">chevron_right</span></button>';
    } else {
      menuItems = '\
      <button onclick="NassimAccount.showView(\'edit-profile\')" class="nassim-account-item w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-container dark:hover:bg-transparent transition-colors text-left group/account"><span class="material-symbols-outlined text-xl text-on-surface-variant dark:text-white/70 transition-colors duration-200 group-hover/account:text-secondary">person</span><span class="font-headline text-sm font-bold text-on-surface dark:text-white transition-all duration-200 group-hover/account:text-secondary group-hover/account:font-extrabold">Edit Profile</span><span class="material-symbols-outlined text-lg text-on-surface-variant/40 ml-auto transition-colors duration-200 group-hover/account:text-secondary">chevron_right</span></button>\
      <button onclick="NassimAccount.showView(\'orders\')" class="nassim-account-item w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-container dark:hover:bg-transparent transition-colors text-left group/account"><span class="material-symbols-outlined text-xl text-on-surface-variant dark:text-white/70 transition-colors duration-200 group-hover/account:text-secondary">receipt_long</span><span class="font-headline text-sm font-bold text-on-surface dark:text-white transition-all duration-200 group-hover/account:text-secondary group-hover/account:font-extrabold">My Orders</span><span class="material-symbols-outlined text-lg text-on-surface-variant/40 ml-auto transition-colors duration-200 group-hover/account:text-secondary">chevron_right</span></button>\
      <a href="wishlist.html" class="nassim-account-item w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-container dark:hover:bg-transparent transition-colors text-left group/account"><span class="material-symbols-outlined text-xl text-on-surface-variant dark:text-white/70 transition-colors duration-200 group-hover/account:text-secondary">favorite</span><span class="font-headline text-sm font-bold text-on-surface dark:text-white transition-all duration-200 group-hover/account:text-secondary group-hover/account:font-extrabold">Wishlist</span><span class="material-symbols-outlined text-lg text-on-surface-variant/40 ml-auto transition-colors duration-200 group-hover/account:text-secondary">chevron_right</span></a>';
    }
    return '\
<div class="nassim-auth-view flex flex-col h-full" style="animation: fade-in 0.3s ease-out;">\
  <div class="px-8 pt-8 pb-6 flex flex-col items-center text-center">\
    <div class="w-20 h-20 rounded-full bg-secondary text-white flex items-center justify-center font-display text-3xl font-extrabold uppercase mb-4">' + initial + '</div>\
    <h2 class="font-display text-2xl font-extrabold text-primary dark:text-white uppercase tracking-tight">' + escapeHtml(user.fullName) + '</h2>\
    <p class="font-body text-sm text-on-surface-variant dark:text-white/70 mt-1">' + escapeHtml(user.email) + '</p>\
    ' + (isAdmin ? '<span class="mt-2 text-[10px] font-bold uppercase tracking-widest text-secondary bg-secondary/10 px-3 py-1 rounded-full">' + (user.role === "ADMIN" ? "Admin" : "Staff") + '</span>' : '') + '\
  </div>\
  <div class="flex-1 px-8 pb-8">\
    <div class="bg-surface-container-lowest dark:bg-surface-container rounded-xl divide-y divide-outline-variant/20 overflow-hidden">\
      ' + menuItems + '\
	      <button onclick="NassimAccount.deleteAccount()" class="nassim-account-item w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-container dark:hover:bg-transparent transition-colors text-left group/account"><span class="material-symbols-outlined text-xl text-on-surface-variant dark:text-white/70 transition-colors duration-200 group-hover/account:text-error">delete_forever</span><span class="font-headline text-sm font-bold text-error transition-all duration-200 group-hover/account:font-extrabold">Delete My Account</span><span class="material-symbols-outlined text-lg text-on-surface-variant/40 ml-auto transition-colors duration-200 group-hover/account:text-error">chevron_right</span></button>\
	      <button onclick="NassimAccount.logout()" class="nassim-account-item w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-container dark:hover:bg-transparent transition-colors text-left group/account"><span class="material-symbols-outlined text-xl text-on-surface-variant dark:text-white/70 transition-colors duration-200">logout</span><span class="font-headline text-sm font-bold text-error">Logout</span><span class="material-symbols-outlined text-lg text-on-surface-variant/40 ml-auto transition-colors duration-200">chevron_right</span></button>\
    </div>\
  </div>\
</div>';
  }

  function renderEditProfile(user) {
    return '\
<div class="nassim-auth-view px-8 pt-8 pb-8 flex flex-col h-full" style="animation: fade-in 0.3s ease-out;">\
  <div class="flex items-center gap-3 mb-6"><button onclick="NassimAccount.showView(\'profile\')" class="text-on-surface-variant dark:text-white/70 hover:text-secondary transition-colors"><span class="material-symbols-outlined">arrow_back</span></button><h2 class="font-display text-2xl font-extrabold text-primary dark:text-white uppercase tracking-tight">Edit Profile</h2></div>\
  <form id="edit-form" class="space-y-4" novalidate>\
    <div><label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-white/70 font-bold mb-2 block">Full Name</label><input id="ep-name" type="text" required value="' + escapeAttr(user.fullName) + '" class="w-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 dark:border-outline-variant/50 text-on-surface dark:text-white text-sm px-4 py-3.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary"></div>\
    <div><label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-white/70 font-bold mb-2 block">Email Address</label><input id="ep-email" type="email" required value="' + escapeAttr(user.email) + '" class="w-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 dark:border-outline-variant/50 text-on-surface dark:text-white text-sm px-4 py-3.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary"></div>\
    <div><label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-white/70 font-bold mb-2 block">Phone Number</label><input id="ep-phone" type="tel" value="' + escapeAttr(user.phone || "") + '" class="w-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 dark:border-outline-variant/50 text-on-surface dark:text-white text-sm px-4 py-3.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary"></div>\
    <div><label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-white/70 font-bold mb-2 block">Current Password</label><div class="relative"><input id="ep-current-password" type="password" class="w-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 dark:border-outline-variant/50 text-on-surface dark:text-white text-sm px-4 py-3.5 pr-12 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary" placeholder="Required to change password"><button type="button" onclick="var el=document.getElementById(\'ep-current-password\');el.type=el.type===\'password\'?\'text\':\'password\';this.querySelector(\'.material-symbols-outlined\').textContent=el.type===\'password\'?\'visibility\':\'visibility_off\'" class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-white/50 hover:text-secondary transition-colors"><span class="material-symbols-outlined text-lg">visibility</span></button></div></div>\
    <div><label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-white/70 font-bold mb-2 block">New Password (optional)</label><div class="relative"><input id="ep-password" type="password" class="w-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 dark:border-outline-variant/50 text-on-surface dark:text-white text-sm px-4 py-3.5 pr-12 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary" placeholder="Leave blank to keep current"><button type="button" onclick="var el=document.getElementById(\'ep-password\');el.type=el.type===\'password\'?\'text\':\'password\';this.querySelector(\'.material-symbols-outlined\').textContent=el.type===\'password\'?\'visibility\':\'visibility_off\'" class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-white/50 hover:text-secondary transition-colors"><span class="material-symbols-outlined text-lg">visibility</span></button></div></div>\
    <div><label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-white/70 font-bold mb-2 block">Confirm New Password</label><div class="relative"><input id="ep-confirm-password" type="password" class="w-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 dark:border-outline-variant/50 text-on-surface dark:text-white text-sm px-4 py-3.5 pr-12 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary" placeholder="Re-enter new password"><button type="button" onclick="var el=document.getElementById(\'ep-confirm-password\');el.type=el.type===\'password\'?\'text\':\'password\';this.querySelector(\'.material-symbols-outlined\').textContent=el.type===\'password\'?\'visibility\':\'visibility_off\'" class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-white/50 hover:text-secondary transition-colors"><span class="material-symbols-outlined text-lg">visibility</span></button></div></div>\
    <div id="edit-error" class="hidden text-xs text-error font-bold"></div>\
    <button type="submit" id="edit-submit" class="w-full bg-primary text-on-primary py-4 font-headline text-xs font-black uppercase tracking-[0.2em] rounded-sm hover:bg-secondary transition-all">Save Changes</button>\
  </form>\
</div>';
  }

  function escapeHtml(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function escapeAttr(s) { return escapeHtml(s); }

  // ===== Orders view =====
  function renderOrders(content, user) {
    content.innerHTML = '<div class="nassim-auth-view px-8 pt-8 pb-8 flex flex-col h-full" style="animation: fade-in 0.3s ease-out;"><div class="flex items-center gap-3 mb-6"><button onclick="NassimAccount.showView(\'profile\')" class="text-on-surface-variant dark:text-white/70 hover:text-secondary transition-colors"><span class="material-symbols-outlined">arrow_back</span></button><h2 class="font-display text-2xl font-extrabold text-primary dark:text-white uppercase tracking-tight">My Orders</h2></div><div id="orders-list" class="flex-1 overflow-y-auto"><p class="text-on-surface-variant dark:text-white/70 text-sm text-center py-8">Loading orders...</p></div></div>';
    fetch("/api/orders", { credentials: "same-origin" }).then(function (r) { return r.json(); }).then(function (data) {
      var orders = data.orders || data.data || [];
      var list = document.getElementById("orders-list");
      if (!list) return;
      if (!orders.length) { list.innerHTML = '<div class="text-center py-12"><span class="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4 block">receipt_long</span><p class="text-on-surface-variant dark:text-white/70 text-sm mb-4">No orders yet.</p><a href="home.html" class="text-secondary font-bold text-xs uppercase tracking-widest hover:underline">Start Shopping</a></div>'; return; }
      var statusColors = { PENDING: "#f59e0b", UNDER_REVIEW: "#3b82f6", READY_FOR_CONFIRMATION: "#6366f1", CONFIRMED: "#22c55e", PACKING: "#8b5cf6", READY_FOR_DELIVERY: "#06b6d4", OUT_FOR_DELIVERY: "#f97316", DELIVERED: "#14b8a6", COMPLETED: "#64748b", CANCELLED_BY_CUSTOMER: "#ef4444", CANCELLED_BY_STAFF: "#ef4444" };
      list.innerHTML = orders.map(function (o) {
        var items = o.items || [];
        var status = String(o.status || "PENDING").toUpperCase();
        var color = statusColors[status] || "#64748b";
        var date = new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        return '<a href="order-detail.html?id=' + o.id + '" class="block bg-surface-container-lowest dark:bg-surface-container rounded-xl p-4 mb-4 hover:shadow-lg transition-shadow cursor-pointer"><div class="flex justify-between items-start mb-2"><div><p class="font-headline font-bold text-sm text-primary dark:text-white">' + escapeHtml(o.orderNumber) + '</p><p class="text-xs text-on-surface-variant dark:text-white/70">' + date + '</p></div><span class="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full" style="background:' + color + "20;color:" + color + '">' + status.replace(/_/g, " ") + '</span></div><div class="space-y-1 mb-3">' + items.slice(0, 3).map(function (i) { var qty = i.qty || i.quantity || 1; return '<div class="flex justify-between text-xs"><span class="text-on-surface-variant dark:text-white/70">' + escapeHtml(i.name) + ' ×' + qty + '</span><span class="font-medium">' + (o.currency || "KD") + " " + (Number(i.price) * qty).toFixed(3) + "</span></div>"; }).join("") + (items.length > 3 ? '<p class="text-xs text-on-surface-variant/60">+' + (items.length - 3) + " more items</p>" : "") + '</div><div class="flex justify-between pt-2 border-t border-outline-variant/20"><span class="text-xs font-bold text-on-surface dark:text-white">Total</span><span class="text-sm font-extrabold text-primary dark:text-white">' + (o.currency || "KD") + " " + Number(o.total).toFixed(3) + '</span></div><div class="mt-2 text-right"><span class="text-xs text-secondary font-bold">View Details →</span></div></a>';
      }).join("");
    }).catch(function () { var list = document.getElementById("orders-list"); if (list) list.innerHTML = '<p class="text-error text-sm text-center py-8">Failed to load orders.</p>'; });
  }

  // ===== Panel controller =====
  var currentView = "signin";

  function showView(view) {
    currentView = view;
    var content = document.getElementById("auth-content");
    if (!content) return;
    var user = getCurrentUser();
    if (view === "signin") content.innerHTML = renderSignIn();
    else if (view === "signup") content.innerHTML = renderSignUp();
    else if (view === "forgot") content.innerHTML = renderForgot();
    else if (view === "profile") {
      if (!user) { showView("signin"); return; }
      content.innerHTML = renderProfile(user);
    } else if (view === "edit-profile") {
      if (!user) { showView("signin"); return; }
      content.innerHTML = renderEditProfile(user);
    } else if (view === "orders") {
      if (!user) { showView("signin"); return; }
      renderOrders(content, user);
    }
    wireForms();
    var firstInput = content.querySelector("input");
    if (firstInput) setTimeout(function () { firstInput.focus(); }, 100);
  }

  function openPanel() {
    var user = getCurrentUser();
    showView(user ? "profile" : "signin");
    var backdrop = document.getElementById("auth-backdrop");
    var panel = document.getElementById("auth-panel");
    if (backdrop) { backdrop.classList.remove("opacity-0", "invisible"); }
    if (panel) {
      panel.classList.remove("translate-x-full", "opacity-0", "invisible", "pointer-events-none");
    }
    document.body.style.overflow = "hidden";
  }

  function closePanel() {
    var backdrop = document.getElementById("auth-backdrop");
    var panel = document.getElementById("auth-panel");
    if (backdrop) { backdrop.classList.add("opacity-0", "invisible"); }
    if (panel) {
      panel.classList.add("translate-x-full", "opacity-0", "invisible", "pointer-events-none");
    }
    document.body.style.overflow = "";
  }

  function showError(el, message) {
    el.textContent = message;
    el.classList.remove("hidden");
  }

  function wireForms() {
    // Sign In
    var signinForm = document.getElementById("signin-form");
    if (signinForm) {
      signinForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var email = document.getElementById("signin-email").value.trim().toLowerCase();
        var password = document.getElementById("signin-password").value;
        var errEl = document.getElementById("signin-error");
        var btn = document.getElementById("signin-submit");
        if (!email || !password) { showError(errEl, "Please fill in all fields."); return; }
        btn.textContent = "Signing In..."; btn.disabled = true;
        apiPost("/api/auth/login", { email: email, password: password }).then(function (res) {
          btn.textContent = "Sign In"; btn.disabled = false;
          if (!res.ok || !res.data.success) { showError(errEl, res.data.error || "Invalid email or password."); return; }
          currentUser = normalizeUser(res.data.data.user);
          updateAccountButton();
          // Merge guest cart into server cart
          mergeGuestCart();
          if (currentUser.isOwner) {
            closePanel();
            showAuthToast("Welcome back! Redirecting to Owner Portal...");
            setTimeout(function () { window.location.href = "/superadmin"; }, 800);
          } else if (currentUser.isAdmin) {
            closePanel();
            showAuthToast("Welcome back! Redirecting to dashboard...");
            setTimeout(function () { window.location.href = "/admin"; }, 800);
          } else {
            closePanel();
            showAuthToast("Signed in — welcome back!");
            setTimeout(function () { window.location.href = "home.html"; }, 400);
          }
        }).catch(function () {
          btn.textContent = "Sign In"; btn.disabled = false;
          showError(errEl, "Network error. Please try again.");
        });
      });
    }
    // Sign Up
    var signupForm = document.getElementById("signup-form");
    if (signupForm) {
      signupForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = document.getElementById("su-name").value.trim();
        var email = document.getElementById("su-email").value.trim().toLowerCase();
        var phone = document.getElementById("su-phone").value.trim();
        var password = document.getElementById("su-password").value;
        var confirm = document.getElementById("su-confirm").value;
        var errEl = document.getElementById("signup-error");
        var btn = document.getElementById("signup-submit");
        if (!name || !email || !password) { showError(errEl, "Please fill in all required fields."); return; }
        if (password.length < 8) { showError(errEl, "Password must be at least 8 characters."); return; }
        if (password !== confirm) { showError(errEl, "Passwords do not match."); return; }
        btn.textContent = "Creating Account..."; btn.disabled = true;
        apiPost("/api/auth/register", { name: name, email: email, phone: phone, password: password }).then(function (res) {
          btn.textContent = "Create Account"; btn.disabled = false;
          if (!res.ok || !res.data.success) { showError(errEl, res.data.error || "Could not create account."); return; }
          currentUser = normalizeUser(res.data.data.user);
          updateAccountButton();
          mergeGuestCart(); // Merge guest cart into new account
          closePanel();
          showAuthToast("Account created — welcome!");
          setTimeout(function () { window.location.href = "home.html"; }, 400);
        }).catch(function () {
          btn.textContent = "Create Account"; btn.disabled = false;
          showError(errEl, "Network error. Please try again.");
        });
      });
    }
    // Forgot
    var forgotForm = document.getElementById("forgot-form");
    if (forgotForm) {
      forgotForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var email = document.getElementById("forgot-email").value.trim();
        var btn = document.getElementById("forgot-submit");
        if (!email) return;
        btn.textContent = "Sending..."; btn.disabled = true;
        fetch("/api/auth/password-reset/request", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email })
        }).then(function(r) { return r.json(); }).then(function(data) {
          if (data && data.success) {
            var content = document.getElementById("auth-content");
            content.innerHTML = '<div class="px-8 pt-8 pb-8 flex flex-col items-center text-center" style="animation: fade-in 0.3s ease-out;"><div class="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mb-6"><span class="material-symbols-outlined text-3xl text-secondary">mark_email_read</span></div><p class="font-headline font-bold text-on-surface dark:text-white mb-2">Check your inbox</p><p class="font-body text-sm text-on-surface-variant dark:text-white/70 max-w-xs">If an account exists for <span class="font-bold">' + escapeHtml(email) + '</span>, you\'ll receive a password reset link shortly.</p><button onclick="NassimAccount.showView(\'signin\')" class="mt-6 font-label text-xs uppercase tracking-widest text-secondary font-bold hover:underline">Back to Sign In</button></div>';
          } else {
            btn.textContent = "Continue"; btn.disabled = false;
            var errEl = document.getElementById("forgot-error");
            if (errEl) { errEl.textContent = data.error || "No account was found with this email address."; errEl.classList.remove("hidden"); }
          }
        }).catch(function() {
          btn.textContent = "Continue"; btn.disabled = false;
          var errEl = document.getElementById("forgot-error");
          if (errEl) { errEl.textContent = "Network error. Please try again."; errEl.classList.remove("hidden"); }
        });
      });
    }
    // Edit Profile
    var editForm = document.getElementById("edit-form");
    if (editForm) {
      editForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = document.getElementById("ep-name").value.trim();
        var email = document.getElementById("ep-email").value.trim().toLowerCase();
        var phone = document.getElementById("ep-phone").value.trim();
        var currentPassword = document.getElementById("ep-current-password").value;
        var password = document.getElementById("ep-password").value;
        var confirmPassword = document.getElementById("ep-confirm-password").value;
        var errEl = document.getElementById("edit-error");
        var btn = document.getElementById("edit-submit");
        if (!name || !email) { showError(errEl, "Name and email are required."); return; }
        if (password) {
          if (!currentPassword) { showError(errEl, "Current password is required to change your password."); return; }
          if (password.length < 8) { showError(errEl, "New password must be at least 8 characters."); return; }
          if (password !== confirmPassword) { showError(errEl, "New password and confirmation do not match."); return; }
        }
        btn.textContent = "Saving..."; btn.disabled = true;
        var body = { name: name, email: email, phone: phone };
        if (password) { body.password = password; body.currentPassword = currentPassword; }
        if (email !== (getCurrentUser() || {}).email && !body.currentPassword) { body.currentPassword = currentPassword; }
        fetch("/api/auth/me", {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        }).then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); }).then(function (res) {
          btn.textContent = "Save Changes"; btn.disabled = false;
          if (!res.ok || !res.data.success) { showError(errEl, res.data.error || "Could not save changes."); return; }
          currentUser = normalizeUser(res.data.data.user);
          updateAccountButton();
          showAuthToast("Changes saved successfully.");
          setTimeout(function () { showView("profile"); }, 400);
        }).catch(function () {
          btn.textContent = "Save Changes"; btn.disabled = false;
          showError(errEl, "Network error. Please try again.");
        });
      });
    }
  }

  function showAuthToast(message) {
    var existing = document.getElementById("auth-toast");
    if (existing) existing.remove();
    // Two-layer structure so the animation can NEVER clobber horizontal
    // centering: the OUTER wrapper owns position (fixed + left:50% +
    // translateX(-50%)) and is never animated; the INNER element owns the
    // slide-up animation (transform: translateY only). Animating transform
    // on a different element than the one carrying translateX(-50%) is what
    // keeps the toast centered — the previous single-element setup let the
    // slideUp @keyframes overwrite translateX(-50%), pushing the toast right.
    var toast = document.createElement("div");
    toast.id = "auth-toast";
    toast.className = "fixed top-24 left-1/2 -translate-x-1/2 z-[300]";
    var inner = document.createElement("div");
    inner.className = "bg-primary text-on-primary px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest shadow-2xl flex items-center gap-2";
    inner.style.animation = "slideUp 0.3s ease-out forwards";
    inner.innerHTML = '<span class="material-symbols-outlined text-sm">check_circle</span>' + message;
    toast.appendChild(inner);
    document.body.appendChild(toast);
    setTimeout(function () { toast.style.opacity = "0"; toast.style.transition = "opacity 0.4s"; setTimeout(function () { toast.remove(); }, 400); }, 2500);
  }

  function deleteAccount() {
    // Remove any existing popup first
    closeDeletePopup();
    // Build centered confirmation popup
    var backdrop = document.createElement("div");
    backdrop.id = "delete-confirm-backdrop";
    backdrop.style.cssText = "position:fixed;inset:0;z-index:250;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:1rem;animation:fade-in 0.2s ease-out;";
    backdrop.onclick = function (e) { if (e.target === backdrop) closeDeletePopup(); };
    backdrop.innerHTML = '\
<div style="background:#fff;max-width:420px;width:100%;border-radius:12px;padding:2rem;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);" class="dark:bg-surface-container">\
  <span class="material-symbols-outlined text-5xl text-error mb-4 block">warning</span>\
  <h3 class="font-display text-xl font-extrabold text-primary dark:text-white uppercase tracking-tight mb-3">Delete My Account</h3>\
  <p class="text-sm text-on-surface-variant dark:text-white/70 leading-relaxed mb-4">Deleting your account is permanent.<br>All your account information and saved contact details will be removed.<br>You will need to sign up again later.</p>\
  <p class="text-xs text-on-surface-variant dark:text-white/70 mb-2 text-left font-semibold uppercase tracking-wider">Confirm with your password</p>\
  <input type="password" id="delete-password-input" autocomplete="current-password" placeholder="Your password" style="width:100%;box-sizing:border-box;padding:0.75rem;border-radius:6px;border:1px solid #ccc;margin-bottom:0.9rem;font-size:0.9rem;background:#fff;color:#000;" class="dark:bg-white/10 dark:border-white/20 dark:text-white" />\
  <div style="display:flex;gap:0.75rem;flex-direction:column;">\
    <button onclick="NassimAccount.closeDeletePopup()" style="width:100%;padding:0.875rem;border-radius:6px;font-weight:700;font-size:0.8125rem;text-transform:uppercase;letter-spacing:0.1em;border:2px solid #333;background:#fff;color:#000;cursor:pointer;transition:background 0.2s;" class="dark:text-white dark:border-white/40 dark:bg-white dark:hover:bg-gray-100">Cancel</button>\
    <button onclick="NassimAccount.doDeleteAccount()" id="delete-confirm-btn" style="width:100%;padding:0.75rem;border-radius:6px;font-weight:700;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;border:none;background:#ef4444;color:#fff;cursor:pointer;transition:background 0.2s;">Delete My Account</button>\
  </div>\
</div>';
    document.body.appendChild(backdrop);
    document.body.style.overflow = "hidden";
    // Enter key in the password field submits; Escape closes the popup.
    var pwInput = document.getElementById("delete-password-input");
    if (pwInput) {
      pwInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); doDeleteAccount(); } });
      try { pwInput.focus(); } catch (err) { /* non-fatal */ }
    }
    backdrop._escHandler = function (e) { if (e.key === "Escape") closeDeletePopup(); };
    document.addEventListener("keydown", backdrop._escHandler);
  }

  function closeDeletePopup() {
    var backdrop = document.getElementById("delete-confirm-backdrop");
    if (!backdrop) return;
    if (backdrop._escHandler) document.removeEventListener("keydown", backdrop._escHandler);
    backdrop.remove();
    // Restore scroll only if the account panel is not also open
    if (!document.getElementById("auth-panel") || document.getElementById("auth-panel").style.transform === "translateX(100%)") {
      document.body.style.overflow = "";
    }
  }

  function doDeleteAccount() {
    var btn = document.getElementById("delete-confirm-btn");
    var pwInput = document.getElementById("delete-password-input");
    var password = pwInput ? pwInput.value : "";
    if (!password) {
      showAuthToast("Please enter your password to confirm the deletion");
      if (pwInput) pwInput.focus();
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = "Deleting..."; btn.style.opacity = "0.6"; }
    fetch("/api/auth/delete-account", {
      method: "DELETE",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password })
    }).then(function (r) { return r.json(); }).then(function (data) {
      closeDeletePopup();
      if (data && data.success) {
        // Account deleted — clear client state and return to logged-out state
        currentUser = null;
        try {
          localStorage.removeItem("nassim_cart");
          localStorage.setItem("nassim_cart", JSON.stringify({ state: { items: [], shipping: 2.5, currency: "KD" } }));
          localStorage.removeItem("nassim_wishlist");
          localStorage.setItem("nassim_wishlist", JSON.stringify({ state: { items: [] } }));
          localStorage.removeItem("nassim_auth");
          clearStoredOwner();
          sessionStorage.clear();
        } catch (e) {}
        updateAccountButton();
        showView("signin");
        showAuthToast("Account deleted successfully");
      } else {
        // Re-enable the button so the customer can retry with the correct
        // password — the popup stays closed (closed above); reopening keeps
        // context via the same delete entry point.
        showAuthToast(data.error || "Failed to delete account");
        if (data && /Incorrect password/i.test(data.error || "")) deleteAccount();
      }
    }).catch(function () {
      closeDeletePopup();
      showAuthToast("Failed to delete account");
    });
  }

  function logout() {
    apiPost("/api/auth/logout").catch(function () {}).then(function () {
      // Clear client-side state. Server cart/wishlist are NOT affected —
      // they remain in the database tied to the userId and will be
      // restored automatically when the user logs back in.
      currentUser = null;
      try {
        // Clear guest localStorage (start fresh as a guest visitor)
        localStorage.removeItem("nassim_cart");
        localStorage.setItem("nassim_cart", JSON.stringify({ state: { items: [], shipping: 2.5, currency: "KD" } }));
        localStorage.removeItem("nassim_wishlist");
        localStorage.setItem("nassim_wishlist", JSON.stringify({ state: { items: [] } }));
        localStorage.removeItem("nassim_auth");
        clearStoredOwner();
        sessionStorage.clear();
      } catch (e) {}
      updateAccountButton();
      closePanel();
      window.location.href = "/home.html";
    });
  }

  // ===== Update the account button in the header =====
  function updateAccountButton() {
    var btn = document.querySelector("[data-account-btn]");
    if (!btn) {
      var buttons = document.querySelectorAll("header button, nav button, header a, nav a");
      for (var i = 0; i < buttons.length; i++) {
        var icon = buttons[i].querySelector(".material-symbols-outlined");
        if (icon && icon.textContent.trim() === "person") {
          btn = buttons[i];
          break;
        }
      }
    }
    if (!btn) return;
    btn.dataset.accountBtn = "1";
    var user = getCurrentUser();
    btn.innerHTML = "";
    btn.style.display = "";
    btn.style.alignItems = "center";
    btn.style.gap = "8px";
    // Only override display if the responsive hidden class is not active (i.e. desktop)
    if (window.innerWidth >= 768) {
      btn.style.display = "flex";
    }
    if (user) {
      var firstName = (user.fullName || "").split(" ")[0];
      var initial = firstName.charAt(0).toUpperCase();
      var nameSpan = document.createElement("span");
      nameSpan.className = "hidden lg:inline font-label text-[13px] font-bold tracking-widest text-primary dark:text-white";
      nameSpan.textContent = firstName;
      btn.appendChild(nameSpan);
      var avatar = document.createElement("span");
      avatar.className = "w-7 h-7 rounded-full bg-secondary text-white flex items-center justify-center font-display text-xs font-extrabold uppercase";
      avatar.textContent = initial;
      btn.appendChild(avatar);
    } else {
      var personIcon = document.createElement("span");
      personIcon.className = "material-symbols-outlined text-primary dark:text-white w-[26px] h-[26px]";
      personIcon.textContent = "person";
      btn.appendChild(personIcon);
    }
  }

  // ===== Init =====
  function init() {
    if (!document.getElementById("auth-panel")) {
      var container = document.createElement("div");
      container.innerHTML = PANEL_HTML;
      while (container.firstChild) document.body.appendChild(container.firstChild);
    }
    var closeBtn = document.getElementById("auth-close");
    if (closeBtn) closeBtn.addEventListener("click", closePanel);
    var backdrop = document.getElementById("auth-backdrop");
    if (backdrop) backdrop.addEventListener("click", closePanel);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePanel(); });
    var buttons = document.querySelectorAll("header button, nav button, header a, nav a");
    for (var i = 0; i < buttons.length; i++) {
      var icon = buttons[i].querySelector(".material-symbols-outlined");
      if (icon && icon.textContent.trim() === "person") {
        var btn = buttons[i];
        btn.dataset.accountWired = "1";
        btn.dataset.accountBtn = "1";
        btn.style.cursor = "pointer";
        btn.addEventListener("click", function (e) { e.preventDefault(); openPanel(); });
        break;
      }
    }
    updateAccountButton();
    // Keep account button visibility in sync with responsive breakpoint
    var resizeTimer;
    window.addEventListener("resize", function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateAccountButton, 150);
    });
    refreshSession().then(function() {
      // Auto-open sign-in panel if redirected from password reset
      try {
        var params = new URLSearchParams(window.location.search);
        if (params.get("signin") === "1") {
          // Clean the URL
          window.history.replaceState({}, document.title, window.location.pathname);
          // Wait for panel to be ready, then open sign-in view
          setTimeout(function() {
            openPanel();
            showView("signin");
          }, 600);
        }
      } catch (e) {}
    });
  }

  // Expose API
  window.NassimAccount = { showView: showView, openPanel: openPanel, closePanel: closePanel, logout: logout, deleteAccount: deleteAccount, closeDeletePopup: closeDeletePopup, doDeleteAccount: doDeleteAccount, getCurrentUser: getCurrentUser, refreshSession: refreshSession };

  if (!document.getElementById("auth-anim-style")) {
    var style = document.createElement("style");
    style.id = "auth-anim-style";
    style.textContent = "@keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } @keyframes slideUp { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }";
    document.head.appendChild(style);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
