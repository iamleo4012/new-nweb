
## Delete My Account — Implementation Plan

### Scope
Three files to touch:
1. **New API route** — `app/api/auth/delete-account/route.ts`
2. **Frontend JS** — `public/assets/js/account.js`
3. **Database migration** — ensure cascade deletes work for user-owned data

No changes to: `prisma/schema.prisma` (cascades already configured correctly), admin panel, middleware, desktop/tablet layouts, or any unrelated functionality.

---

### Step 1: Create `app/api/auth/delete-account/route.ts`

A `DELETE` endpoint (following REST semantics for deletion):

```
DELETE /api/auth/delete-account
```

**Logic:**
1. Get the current user via `getSessionUser()` from `lib/auth.ts`
2. If no user → 401 unauthorized
3. Use `prisma.user.delete({ where: { id: user.id } })` inside a transaction
4. Prisma schema already has `onDelete: Cascade` on `Session`, `CartItem`, `WishlistItem`, `Address`, `PasswordResetToken` → these are automatically deleted
5. `Order` has `userId Int?` (optional, no cascade) → orders are preserved with `userId = null`
6. After successful DB delete, call `destroySession()` to clear the cookie
7. Return `{ success: true, data: null, error: null }`
8. Wrap in try/catch → 500 error on failure

**Validation:** No request body needed — the endpoint operates on the authenticated user from the session cookie.

**Pattern:** Follows existing route patterns — uses `NextResponse.json({ success, data, error })`, imports from `@/lib/auth` and `@/lib/db`.

---

### Step 2: Modify `public/assets/js/account.js`

**2a. Add "Delete My Account" button** in `renderProfile()` (around line 210):
- Insert a new `<button>` directly **above** the existing Logout button
- Styled consistently with the other menu items but with `text-error` color and a `delete_forever` Material Symbol icon
- `onclick="NassimAccount.deleteAccount()"`

**2b. Add `deleteAccount()` function:**
- Shows a centered confirmation popup (modal) with the exact text specified
- Popup styled with the same design language: dark backdrop overlay (reuses `#auth-backdrop` pattern), centered card, responsive

**2c. Popup structure:**
```
#delete-confirm-backdrop  — fixed inset-0, semi-transparent black, z-[250]
  #delete-confirm-dialog — centered card, max-w-md, responsive padding
    - Warning icon (warning Material Symbol)
    - Title: "Delete My Account"
    - Body text (exact text from requirements)
    - Two buttons:
      - "Cancel" — closes popup, no action
      - "Delete My Account" — calls the API, then logs out
```

**2d. Delete flow in `doDeleteAccount()`:**
1. Call `DELETE /api/auth/delete-account` via fetch with `credentials: "same-origin"`
2. On success → call existing `logout()` function (clears client state, closes panel, redirects to home)
3. On failure → show error toast via existing `showAuthToast()`, close popup

**2e. Popup behaviors:**
- Cancel button closes popup
- Clicking backdrop closes popup
- Escape key closes popup
- Only shown when user is logged in (it's inside `renderProfile()`)

---

### Step 3: Verify database cascade behavior

Run `npx prisma db push` or verify the schema is consistent — no migration needed since cascades are already declared in the schema:
- `Session` → `onDelete: Cascade` ✓
- `CartItem` → `onDelete: Cascade` ✓
- `WishlistItem` → `onDelete: Cascade` ✓
- `Address` → `onDelete: Cascade` ✓
- `PasswordResetToken` → `onDelete: Cascade` ✓
- `Order` → no cascade (preserves order history) ✓

---

### Verification
- `npm run typecheck` must pass
- Test on mobile (375px) and desktop viewports
- Verify: popup opens, cancel works, delete removes user data and logs out
- Verify: popup doesn't show when logged out
- Verify: desktop layout unchanged
