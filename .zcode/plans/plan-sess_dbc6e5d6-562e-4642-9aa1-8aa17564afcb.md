## Implementation Plan: Mobile Navigation Redesign

### Files to Change

| # | File | Action |
|---|------|--------|
| 1 | `public/home.html` | Hide account icon on mobile, add hamburger placeholder inside nav |
| 2 | `public/assets/js/mobile-nav.js` | **Full rewrite** — accordion drawer with auth-aware sections |

No changes to: `account.js`, `theme.js`, `search.js`, `cart-nav.js`, `product-nav.js`, desktop nav HTML.

---

### Step 1: `public/home.html` — Nav bar changes (lines 420–422)

**Hide the account icon on mobile** by adding `md:flex hidden` to the button:
```html
<!-- Before -->
<button class="hover:opacity-80 ...">
  <span ...>person</span>
</button>

<!-- After -->
<button class="hover:opacity-80 ... hidden md:flex">
  <span ...>person</span>
</button>
```

**Add a hamburger placeholder** right after the account button (still inside the nav's right icon group). This is a mobile-only empty button that `mobile-nav.js` will replace with a proper animated hamburger:
```html
<button id="hamburger-slot" class="md:hidden hover:opacity-80 transition-all duration-300 active:scale-95" aria-label="Open menu">
  <span class="material-symbols-outlined text-primary dark:text-white w-[26px] h-[26px]">menu</span>
</button>
```

**Why a placeholder in HTML instead of JS injection?** 
- Keeps the hamburger inside the nav flex container (equal spacing with other icons)
- Eliminates the current positioning hack (`fixed top-3 right-20`)
- `mobile-nav.js` will find `#hamburger-slot` and replace its innerHTML with the animated 3-bar + X toggle

---

### Step 2: `public/assets/js/mobile-nav.js` — Full rewrite

**Current state (109 lines):** Injects hamburger into `document.body`, creates flat link drawer with no accordion, no auth awareness.

**New behavior (≈200 lines):**

#### 2a. Hamburger hijack
- Find `#hamburger-slot` in nav
- Replace its innerHTML with the animated 3-bar spans (bar1, bar2, bar3)
- Keep it positioned inline in the nav flex flow (no `fixed` positioning)
- On click → toggle open/close with bar-to-X animation

#### 2b. Drawer content (dynamic, auth-aware)

**Read category data from existing desktop dropdowns** in the DOM — no hardcoding:
```javascript
// Parse the existing desktop dropdown menus
var categories = [];
document.querySelectorAll('.dropdown-trigger').forEach(function(trigger) {
  var link = trigger.querySelector('a');
  var subcats = [];
  trigger.querySelectorAll('.dropdown-menu a').forEach(function(a) {
    subcats.push({ name: a.textContent.trim(), href: a.href });
  });
  categories.push({ name: link.textContent.trim(), href: link.href, subcats: subcats });
});
```

This reads directly from the desktop nav (lines 346–377), so if categories change, the mobile menu updates automatically.

**Guest state menu:**
```
─── Login / Sign In ───
─── divider ───
Houseware Equipment  ▼
Supermarket Equipment  ▼
Warehouse Equipment  ▼
```

**Logged-in state menu:**
```
─── Shopping Cart ───
─── Wishlist ───
─── Track Order ───
─── Logout ───
─── divider ───
Houseware Equipment  ▼
Supermarket Equipment  ▼
Warehouse Equipment  ▼
```

Auth state detected via `window.NassimAccount` (exposed by `account.js` at line 548). Since scripts load with `defer`, execution order is guaranteed: `account.js` (line 1074) runs before `mobile-nav.js` (line 1075), so `window.NassimAccount` is available.

#### 2c. Accordion behavior

Each department row has a tap target:
```
Houseware Equipment    ▼
```
- Tap → toggles a `<div>` with `max-height` transition (smooth CSS animation)
- Arrow rotates from ▼ to ▲
- Subcategory links slide down/up
- Each department expands independently

#### 2d. Drawer structure HTML (Tailwind)
```
<div id="mobile-nav-drawer" class="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white dark:bg-gray-900 z-[80] shadow-2xl translate-x-full transition-transform duration-300 overflow-y-auto">
  <!-- Header: logo + close -->
  <div class="flex items-center justify-between px-5 py-4 border-b ...">
    <img src="LOGO.png" class="h-10"/>
    <button id="mobile-nav-close"><span class="material-symbols-outlined">close</span></button>
  </div>
  
  <!-- Auth-aware section (dynamic) -->
  <div id="mobile-nav-auth-section">
    <!-- Login OR Cart/Wishlist/Track/Logout -->
  </div>
  
  <!-- Divider -->
  
  <!-- Departments with accordions -->
  <div id="mobile-nav-departments">
    <!-- Generated from DOM dropdown data -->
  </div>
</div>
```

#### 2e. Accordion CSS (injected via style tag)
```css
.mobile-accordion-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}
.mobile-accordion-content.open {
  max-height: 300px;
}
```

#### 2f. Drawer re-render on auth state change

After login/logout, `account.js` calls `updateAccountButton()`. The new `mobile-nav.js` will:
- Listen for a custom event `nassim:auth-change` dispatched after login/logout
- OR poll `window.NassimAccount.getCurrentUser()` when drawer opens
- Re-render the auth section accordingly

Simplest approach: **re-render auth section every time the drawer opens** (called in `openMenu()`).

#### 2g. Login link behavior

"Login / Sign In" taps → calls `window.NassimAccount.openPanel()` (which opens the existing auth slide-in panel from `account.js`). This reuses existing auth UI — no duplication.

#### 2h. Logout behavior

"Logout" tap → calls `window.NassimAccount.logout()` (existing function in `account.js`). This handles session clearing and redirect.

---

### Step 3: No other files modified

- **Desktop nav** (lines 344–380): untouched — `hidden md:flex` keeps it desktop-only
- **`account.js`**: untouched — `window.NassimAccount` API already provides `getCurrentUser()`, `openPanel()`, `logout()`
- **`theme.js`**, **`search.js`**, **`cart-nav.js`**: untouched
- **All JS event listeners** on search, language, theme, cart, download buttons: untouched

---

### Summary of changes

1. **`home.html`**: Hide account icon on mobile (`hidden md:flex`), add hamburger placeholder button
2. **`mobile-nav.js`**: Rewrite to use in-nav hamburger, DOM-sourced category data, auth-aware sections, accordion dropdowns, existing `NassimAccount` API for login/logout