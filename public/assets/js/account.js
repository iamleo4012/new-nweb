/**
 * AL-NASSIM Account System
 * ============================================================================
 * Full frontend auth: slide-in panel with Sign In, Sign Up, Forgot Password,
 * Profile, and Edit Profile views. State persisted in localStorage.
 *
 * Include on every page: <script src="assets/js/account.js"></script>
 * The script auto-injects the panel HTML into the page.
 * ============================================================================
 */
(function () {
  "use strict";

  var AUTH_KEY = "nassim_auth";

  // ===== State helpers =====
  function readState() {
    try {
      var raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return { users: [], currentUserId: null };
      var parsed = JSON.parse(raw);
      return parsed && parsed.state ? parsed.state : parsed;
    } catch (e) {
      return { users: [], currentUserId: null };
    }
  }
  function saveState(state) {
    try { localStorage.setItem(AUTH_KEY, JSON.stringify({ state: state })); } catch (e) {}
  }
  function getCurrentUser() {
    var s = readState();
    if (!s.users || !s.currentUserId) return null;
    for (var i = 0; i < s.users.length; i++) {
      if (s.users[i].id === s.currentUserId) return s.users[i];
    }
    return null;
  }
  function genId() { return "u_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // ===== Panel HTML (injected into the page) =====
  var PANEL_HTML = '\
<div id="auth-backdrop" class="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm opacity-0 invisible transition-opacity duration-300"></div>\
<div id="auth-panel" class="fixed top-0 right-0 h-full w-full md:w-[400px] bg-surface dark:bg-[#0a0f14] shadow-2xl z-[201] translate-x-full transition-transform duration-400 flex flex-col">\
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
    <div><label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-white/70 font-bold mb-2 block">Password</label><input id="signin-password" type="password" required class="w-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 dark:border-outline-variant/50 text-on-surface dark:text-white text-sm px-4 py-3.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary" placeholder="********"></div>\
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
    <div><label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-white/70 font-bold mb-2 block">Phone Number</label><input id="su-phone" type="tel" required class="w-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 dark:border-outline-variant/50 text-on-surface dark:text-white text-sm px-4 py-3.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary" placeholder="+965 6000 0000"></div>\
    <div><label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-white/70 font-bold mb-2 block">Address Line 1</label><input id="su-address" type="text" required class="w-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 dark:border-outline-variant/50 text-on-surface dark:text-white text-sm px-4 py-3.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary" placeholder="Street, building, area"></div>\
    <div><label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-white/70 font-bold mb-2 block">Password</label><input id="su-password" type="password" required class="w-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 dark:border-outline-variant/50 text-on-surface dark:text-white text-sm px-4 py-3.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary" placeholder="At least 6 characters"></div>\
    <div><label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-white/70 font-bold mb-2 block">Confirm Password</label><input id="su-confirm" type="password" required class="w-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 dark:border-outline-variant/50 text-on-surface dark:text-white text-sm px-4 py-3.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary" placeholder="Re-enter password"></div>\
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
    <button type="submit" id="forgot-submit" class="w-full bg-primary text-on-primary py-4 font-headline text-xs font-black uppercase tracking-[0.2em] rounded-sm hover:bg-secondary transition-all">Continue</button>\
  </form>\
  <p class="text-center font-label text-xs text-on-surface-variant dark:text-white/70 mt-6">Remembered it? <button onclick="NassimAccount.showView(\'signin\')" class="text-secondary font-bold hover:underline">Back to Sign In</button></p>\
</div>';
  }

  function renderProfile(user) {
    var initial = (user.fullName || "?").charAt(0).toUpperCase();
    var isAdmin = user.isAdmin === true || user.email === "admin@gmail.com";
    var menuItems = "";
    if (isAdmin) {
      menuItems = '\
      <a href="/admin" class="w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-container dark:hover:bg-surface-container-high transition-colors text-left"><span class="material-symbols-outlined text-xl text-on-surface-variant dark:text-white/70">dashboard</span><span class="font-headline text-sm font-bold text-on-surface dark:text-white">Go to Dashboard</span><span class="material-symbols-outlined text-lg text-on-surface-variant/40 ml-auto">chevron_right</span></a>\
      <a href="/admin" class="w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-container dark:hover:bg-surface-container-high transition-colors text-left"><span class="material-symbols-outlined text-xl text-on-surface-variant dark:text-white/70">inventory_2</span><span class="font-headline text-sm font-bold text-on-surface dark:text-white">Product Management</span><span class="material-symbols-outlined text-lg text-on-surface-variant/40 ml-auto">chevron_right</span></a>\
      <a href="/admin" class="w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-container dark:hover:bg-surface-container-high transition-colors text-left"><span class="material-symbols-outlined text-xl text-on-surface-variant dark:text-white/70">category</span><span class="font-headline text-sm font-bold text-on-surface dark:text-white">Department Management</span><span class="material-symbols-outlined text-lg text-on-surface-variant/40 ml-auto">chevron_right</span></a>\
      <a href="/admin" class="w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-container dark:hover:bg-surface-container-high transition-colors text-left"><span class="material-symbols-outlined text-xl text-on-surface-variant dark:text-white/70">receipt_long</span><span class="font-headline text-sm font-bold text-on-surface dark:text-white">Orders Management</span><span class="material-symbols-outlined text-lg text-on-surface-variant/40 ml-auto">chevron_right</span></a>';
    } else {
      menuItems = '\
      <button onclick="NassimAccount.showView(\'edit-profile\')" class="w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-container dark:hover:bg-surface-container-high transition-colors text-left"><span class="material-symbols-outlined text-xl text-on-surface-variant dark:text-white/70">person</span><span class="font-headline text-sm font-bold text-on-surface dark:text-white">Edit Profile</span><span class="material-symbols-outlined text-lg text-on-surface-variant/40 ml-auto">chevron_right</span></button>\
      <a href="wishlist.html" class="w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-container dark:hover:bg-surface-container-high transition-colors text-left"><span class="material-symbols-outlined text-xl text-on-surface-variant dark:text-white/70">favorite</span><span class="font-headline text-sm font-bold text-on-surface dark:text-white">Wishlist</span><span class="material-symbols-outlined text-lg text-on-surface-variant/40 ml-auto">chevron_right</span></a>\
      <button onclick="NassimAccount.showView(\'orders\')" class="w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-container dark:hover:bg-surface-container-high transition-colors text-left"><span class="material-symbols-outlined text-xl text-on-surface-variant dark:text-white/70">receipt_long</span><span class="font-headline text-sm font-bold text-on-surface dark:text-white">My Orders</span><span class="material-symbols-outlined text-lg text-on-surface-variant/40 ml-auto">chevron_right</span></button>';
    }
    return '\
<div class="nassim-auth-view flex flex-col h-full" style="animation: fade-in 0.3s ease-out;">\
  <div class="px-8 pt-8 pb-6 flex flex-col items-center text-center">\
    <div class="w-20 h-20 rounded-full bg-secondary text-white flex items-center justify-center font-display text-3xl font-extrabold uppercase mb-4">' + initial + '</div>\
    <h2 class="font-display text-2xl font-extrabold text-primary dark:text-white uppercase tracking-tight">' + escapeHtml(user.fullName) + '</h2>\
    <p class="font-body text-sm text-on-surface-variant dark:text-white/70 mt-1">' + escapeHtml(user.email) + '</p>\
    ' + (isAdmin ? '<span class="mt-2 text-[10px] font-bold uppercase tracking-widest text-secondary bg-secondary/10 px-3 py-1 rounded-full">Admin</span>' : '') + '\
  </div>\
  <div class="flex-1 px-8 pb-8">\
    <div class="bg-surface-container-lowest dark:bg-surface-container rounded-xl divide-y divide-outline-variant/20 overflow-hidden">\
      ' + menuItems + '\
      <button onclick="NassimAccount.logout()" class="w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-container dark:hover:bg-surface-container-high transition-colors text-left"><span class="material-symbols-outlined text-xl text-on-surface-variant dark:text-white/70">logout</span><span class="font-headline text-sm font-bold text-error">Logout</span><span class="material-symbols-outlined text-lg text-on-surface-variant/40 ml-auto">chevron_right</span></button>\
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
    <div><label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-white/70 font-bold mb-2 block">Phone Number</label><input id="ep-phone" type="tel" required value="' + escapeAttr(user.phone || "") + '" class="w-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 dark:border-outline-variant/50 text-on-surface dark:text-white text-sm px-4 py-3.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary"></div>\
    <div><label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-white/70 font-bold mb-2 block">Address Line 1</label><input id="ep-address" type="text" required value="' + escapeAttr(user.address || "") + '" class="w-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 dark:border-outline-variant/50 text-on-surface dark:text-white text-sm px-4 py-3.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary"></div>\
    <div><label class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-white/70 font-bold mb-2 block">New Password (optional)</label><input id="ep-password" type="password" class="w-full bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 dark:border-outline-variant/50 text-on-surface dark:text-white text-sm px-4 py-3.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-secondary" placeholder="Leave blank to keep current"></div>\
    <div id="edit-error" class="hidden text-xs text-error font-bold"></div>\
    <button type="submit" id="edit-submit" class="w-full bg-primary text-on-primary py-4 font-headline text-xs font-black uppercase tracking-[0.2em] rounded-sm hover:bg-secondary transition-all">Save Changes</button>\
  </form>\
</div>';
  }

  function escapeHtml(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function escapeAttr(s) { return escapeHtml(s); }

  // ===== Panel controller =====
  var currentView = "signin";

  function renderOrders(content, user) {
    content.innerHTML = '<div class="nassim-auth-view px-8 pt-8 pb-8 flex flex-col h-full" style="animation: fade-in 0.3s ease-out;"><div class="flex items-center gap-3 mb-6"><button onclick="NassimAccount.showView(\'profile\')" class="text-on-surface-variant dark:text-white/70 hover:text-secondary transition-colors"><span class="material-symbols-outlined">arrow_back</span></button><h2 class="font-display text-2xl font-extrabold text-primary dark:text-white uppercase tracking-tight">My Orders</h2></div><div id="orders-list" class="flex-1 overflow-y-auto"><p class="text-on-surface-variant dark:text-white/70 text-sm text-center py-8">Loading orders...</p></div></div>';
    fetch("/api/orders").then(function(r) { return r.json(); }).then(function(data) {
      var orders = (data.orders || []).filter(function(o) { return o.customerEmail === user.email; });
      var list = document.getElementById("orders-list");
      if (!orders.length) { list.innerHTML = '<div class="text-center py-12"><span class="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4 block">receipt_long</span><p class="text-on-surface-variant dark:text-white/70 text-sm mb-4">No orders yet.</p><a href="home.html" class="text-secondary font-bold text-xs uppercase tracking-widest hover:underline">Start Shopping</a></div>'; return; }
      var statusColors = { pending: "#f59e0b", confirmed: "#3b82f6", preparing: "#8b5cf6", out_for_delivery: "#06b6d4", delivered: "#22c55e", cancelled: "#ef4444" };
      list.innerHTML = orders.map(function(o) {
        var items = o.items || [];
        var date = new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        return '<div class="bg-surface-container-lowest dark:bg-surface-container rounded-xl p-4 mb-4"><div class="flex justify-between items-start mb-2"><div><p class="font-headline font-bold text-sm text-primary dark:text-white">' + escapeHtml(o.orderNumber) + '</p><p class="text-xs text-on-surface-variant dark:text-white/70">' + date + '</p></div><span class="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full" style="background:' + (statusColors[o.status] || "#64748b") + "20;color:" + (statusColors[o.status] || "#64748b") + '">' + o.status.replace(/_/g, " ") + '</span></div><div class="space-y-1 mb-3">' + items.slice(0, 3).map(function(i) { return '<div class="flex justify-between text-xs"><span class="text-on-surface-variant dark:text-white/70">' + escapeHtml(i.name) + ' ×' + i.qty + '</span><span class="font-medium">' + (o.currency||"KD") + " " + (i.price * i.qty).toFixed(3) + "</span></div>"; }).join("") + (items.length > 3 ? '<p class="text-xs text-on-surface-variant/60">+' + (items.length - 3) + " more items</p>" : "") + '</div><div class="flex justify-between pt-2 border-t border-outline-variant/20"><span class="text-xs font-bold text-on-surface dark:text-white">Total</span><span class="text-sm font-extrabold text-primary dark:text-white">' + (o.currency||"KD") + " " + o.total.toFixed(3) + "</span></div></div>";
      }).join("");
    }).catch(function() { document.getElementById("orders-list").innerHTML = '<p class="text-error text-sm text-center py-8">Failed to load orders.</p>'; });
  }

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
    // Focus first input
    var firstInput = content.querySelector("input");
    if (firstInput) setTimeout(function() { firstInput.focus(); }, 100);
  }

  function openPanel() {
    var user = getCurrentUser();
    showView(user ? "profile" : "signin");
    var backdrop = document.getElementById("auth-backdrop");
    var panel = document.getElementById("auth-panel");
    if (backdrop) { backdrop.classList.remove("opacity-0", "invisible"); }
    if (panel) { panel.classList.remove("translate-x-full"); }
    document.body.style.overflow = "hidden";
  }

  function closePanel() {
    var backdrop = document.getElementById("auth-backdrop");
    var panel = document.getElementById("auth-panel");
    if (backdrop) { backdrop.classList.add("opacity-0", "invisible"); }
    if (panel) { panel.classList.add("translate-x-full"); }
    document.body.style.overflow = "";
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
        if (!email || !password) { errEl.textContent = "Please fill in all fields."; errEl.classList.remove("hidden"); return; }
        btn.textContent = "Signing In..."; btn.disabled = true;
        setTimeout(function () {
          // ===== Admin login check =====
          if (email === "admin@gmail.com" && password === "admin123") {
            var adminUser = { id: "admin", fullName: "Admin", email: "admin@gmail.com", isAdmin: true };
            var adminState = readState();
            adminState.currentUserId = "admin";
            // Ensure admin user exists in users array
            var adminExists = false;
            for (var ai = 0; ai < adminState.users.length; ai++) { if (adminState.users[ai].id === "admin") { adminExists = true; break; } }
            if (!adminExists) adminState.users.push(adminUser);
            saveState(adminState);
            updateAccountButton();
            closePanel();
            showAuthToast("Welcome, Admin! Redirecting...");
            setTimeout(function () { window.location.href = "/admin"; }, 800);
            btn.textContent = "Sign In"; btn.disabled = false;
            return;
          }
          // ===== Normal user login =====
          var s = readState();
          var user = null;
          for (var i = 0; i < s.users.length; i++) { if (s.users[i].email.toLowerCase() === email) { user = s.users[i]; break; } }
          if (!user) { errEl.textContent = "No account found with this email."; errEl.classList.remove("hidden"); btn.textContent = "Sign In"; btn.disabled = false; return; }
          if (user.password !== password) { errEl.textContent = "Incorrect password. Please try again."; errEl.classList.remove("hidden"); btn.textContent = "Sign In"; btn.disabled = false; return; }
          s.currentUserId = user.id; saveState(s);
          updateAccountButton();
          showAuthToast("Signed in — welcome back!");
          setTimeout(function () { showView("profile"); }, 800);
          btn.textContent = "Sign In"; btn.disabled = false;
        }, 600);
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
        var address = document.getElementById("su-address").value.trim();
        var password = document.getElementById("su-password").value;
        var confirm = document.getElementById("su-confirm").value;
        var errEl = document.getElementById("signup-error");
        var btn = document.getElementById("signup-submit");
        if (!name || !email || !phone || !address || !password) { errEl.textContent = "Please fill in all fields."; errEl.classList.remove("hidden"); return; }
        if (password.length < 6) { errEl.textContent = "Password must be at least 6 characters."; errEl.classList.remove("hidden"); return; }
        if (password !== confirm) { errEl.textContent = "Passwords do not match."; errEl.classList.remove("hidden"); return; }
        btn.textContent = "Creating Account..."; btn.disabled = true;
        setTimeout(function () {
          var s = readState();
          for (var i = 0; i < s.users.length; i++) { if (s.users[i].email.toLowerCase() === email) { errEl.textContent = "An account with this email already exists."; errEl.classList.remove("hidden"); btn.textContent = "Create Account"; btn.disabled = false; return; } }
          var user = { id: genId(), fullName: name, email: email, phone: phone, address: address, password: password, createdAt: Date.now() };
          s.users.push(user); s.currentUserId = user.id; saveState(s);
          updateAccountButton();
          showAuthToast("Account created — welcome!");
          setTimeout(function () { showView("profile"); }, 800);
          btn.textContent = "Create Account"; btn.disabled = false;
        }, 600);
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
        setTimeout(function () {
          var content = document.getElementById("auth-content");
          content.innerHTML = '<div class="px-8 pt-8 pb-8 flex flex-col items-center text-center" style="animation: fade-in 0.3s ease-out;"><div class="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mb-6"><span class="material-symbols-outlined text-3xl text-secondary">mark_email_read</span></div><p class="font-headline font-bold text-on-surface dark:text-white mb-2">Check your inbox</p><p class="font-body text-sm text-on-surface-variant dark:text-white/70 max-w-xs">If an account exists for <span class="font-bold">' + escapeHtml(email) + '</span>, you\'ll receive a password reset link shortly.</p><button onclick="NassimAccount.showView(\'signin\')" class="mt-6 font-label text-xs uppercase tracking-widest text-secondary font-bold hover:underline">Back to Sign In</button></div>';
        }, 600);
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
        var address = document.getElementById("ep-address").value.trim();
        var password = document.getElementById("ep-password").value;
        var errEl = document.getElementById("edit-error");
        var btn = document.getElementById("edit-submit");
        if (!name || !email || !phone || !address) { errEl.textContent = "Please fill in all required fields."; errEl.classList.remove("hidden"); return; }
        btn.textContent = "Saving..."; btn.disabled = true;
        setTimeout(function () {
          var s = readState();
          for (var i = 0; i < s.users.length; i++) {
            if (s.users[i].id === s.currentUserId) {
              s.users[i].fullName = name; s.users[i].email = email; s.users[i].phone = phone; s.users[i].address = address;
              if (password) s.users[i].password = password;
            }
          }
          saveState(s); updateAccountButton();
          showAuthToast("Changes saved successfully.");
          setTimeout(function () { showView("profile"); }, 800);
          btn.textContent = "Save Changes"; btn.disabled = false;
        }, 600);
      });
    }
  }

  function showAuthToast(message) {
    var existing = document.getElementById("auth-toast");
    if (existing) existing.remove();
    var toast = document.createElement("div");
    toast.id = "auth-toast";
    toast.className = "fixed top-24 left-1/2 -translate-x-1/2 z-[300] bg-primary text-on-primary px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest shadow-2xl flex items-center gap-2";
    toast.style.animation = "slideUp 0.3s ease-out forwards";
    toast.innerHTML = '<span class="material-symbols-outlined text-sm">check_circle</span>' + message;
    document.body.appendChild(toast);
    setTimeout(function () { toast.style.opacity = "0"; toast.style.transition = "opacity 0.4s"; setTimeout(function () { toast.remove(); }, 400); }, 2500);
  }

  function logout() {
    var s = readState(); s.currentUserId = null; saveState(s);
    updateAccountButton();
    closePanel();
    showAuthToast("Signed out successfully.");
  }

  // ===== Update the account button in the header =====
  function updateAccountButton() {
    // Find the account button by data-account-btn marker (set during init)
    // or fall back to searching for a 'person' icon.
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
    btn.dataset.accountBtn = "1"; // mark for future lookups
    var user = getCurrentUser();
    btn.innerHTML = "";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.gap = "8px";
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
    // Inject panel HTML
    if (!document.getElementById("auth-panel")) {
      var container = document.createElement("div");
      container.innerHTML = PANEL_HTML;
      while (container.firstChild) document.body.appendChild(container.firstChild);
    }
    // Wire close
    var closeBtn = document.getElementById("auth-close");
    if (closeBtn) closeBtn.addEventListener("click", closePanel);
    var backdrop = document.getElementById("auth-backdrop");
    if (backdrop) backdrop.addEventListener("click", closePanel);
    // Escape key
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePanel(); });
    // Wire account button (person icon) — mark with data-account-btn
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
    // Update button state
    updateAccountButton();
    // Sync across tabs/pages
    window.addEventListener("storage", function (e) { if (e.key === AUTH_KEY) updateAccountButton(); });
  }

  // Expose API
  window.NassimAccount = { showView: showView, openPanel: openPanel, closePanel: closePanel, logout: logout, getCurrentUser: getCurrentUser };

  // Add fade-in animation if not present
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
