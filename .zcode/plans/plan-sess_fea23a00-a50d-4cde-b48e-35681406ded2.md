## Revised plan: Order ownership anchor + historical snapshot (post full audit)

### Audit result — all email-based order-ownership sites found
The full grep across `app/` + `lib/` found **5** customer-facing sites that identify orders by `customerEmail`/`user.email` (the original plan listed only 3 — this revision fixes all 5):

1. `app/api/orders/route.ts:163` — `GET /api/orders` list: `OR: [{ userId }, { customerEmail: user.email }]`
2. `app/api/orders/[id]/route.ts:47` — order detail owner check
3. `app/api/orders/[id]/confirm/route.ts:53` — confirm/cancel owner check
4. **`app/api/notifications/route.ts:19`** — surfaces notifications by matching orders whose `customerEmail = user.email` (missed before)
5. `app/api/admin/customers/[id]/route.ts:45` — admin customer-detail order list (admin-scoped; kept — operates on a *current/live* user, not a deleted one; deleted-account orders are reachable by invoice search instead)

Admin-only routes (`admin/orders`, `admin/stats`) read `customerEmail` for display only — not ownership — so they're untouched.

---

### 1. Schema — `prisma/schema.prisma` (Order model)
Add two snapshot columns (the permanent ownership identifier + historical email):
```prisma
originalUserId    Int?     @map("original_user_id")
originalUserEmail String   @default("") @map("original_user_email")
@@index([originalUserId])
@@index([originalUserEmail])
```
`orderNumber` (`AN-<YEAR>-<000001>`) is already the permanent unique invoice number — no new field needed. Existing `userId`/`customerEmail`/`customerName/Phone/address/city` all preserved.

### 2. Migration with backfill — no historical order left without a snapshot
Create `prisma/migrations/<ts>_order_ownership_snapshot/migration.sql`. The SQL will:
- `ALTER TABLE` add `original_user_id INT NULL` and `original_user_email TEXT NOT NULL DEFAULT ''` + indexes.
- **Backfill from existing data so every row gets a correct snapshot:**
  ```sql
  UPDATE "Order" SET "original_user_id" = "userId"
    WHERE "original_user_id" IS NULL AND "userId" IS NOT NULL;
  UPDATE "Order" SET "original_user_email" = "customerEmail"
    WHERE "original_user_email" = '' AND "customerEmail" <> '';
  ```
  This preserves all existing data — `originalUserId ← userId`, `originalUserEmail ← customerEmail`. Guest orders (userId null, email set) get `originalUserId=null` (correct) and `originalUserEmail=<their email>`. Orders placed by already-deleted accounts (userId null) are preserved with their `customerEmail`/snapshot exactly as-is.
- Run via `npx prisma migrate dev --name order_ownership_snapshot` (I'll author the SQL to include the backfill so it's atomic and no row is left incorrect). Verify the generated client picks up the fields.

### 3. Order creation — `app/api/orders/route.ts` POST
In the `tx.order.create` block (~line 91), snapshot the original owner at checkout:
```ts
originalUserId: user?.id ?? null,
originalUserEmail: user?.email ?? input.customerEmail,
```

### 4. Account deletion — `app/api/auth/delete-account/route.ts`
Inside the existing transaction, BEFORE `tx.user.delete`, tombstone the live `customerEmail` on the user's orders so a reused email can NEVER match any customer-facing email clause — while leaving the snapshot fields intact for admin/history:
```ts
await tx.order.updateMany({
  where: { OR: [{ userId: user.id }, { customerEmail: user.email }] },
  data: { customerEmail: `deleted+${user.id}+${user.email}`, userId: null },
});
```
`originalUserId`/`originalUserEmail` are untouched → admin still sees the real historical customer; cascades (sessions/cart/wishlist/addresses/tokens) unchanged.

### 5. Fix ALL 4 customer-facing email-ownership sites (stop using email alone for authenticated users)
- **`app/api/orders/route.ts` GET (line 163):** `where: { userId: user.id }` — drop the email OR-clause.
- **`app/api/orders/[id]/route.ts` (line 47):** `isOwner = user && order.userId === user.id` — drop `|| customerEmail`. Guest-by-orderNumber access (no session) stays.
- **`app/api/orders/[id]/confirm/route.ts` (line 53):** `isOwner = order.userId === user.id` — drop `|| customerEmail`.
- **`app/api/notifications/route.ts` (line 17-24):** `where: { userId: user.id }` — drop the email-derived `orderId IN (...)` clause entirely. (Owned orders' notifications already carry `userId` via `createNotification`; guest-order notifications are reachable only via the order's own flow, consistent with "new account sees nothing from the old account.")

Result: a logged-in user is tied to orders strictly by their current account's `userId`. A deleted account's orders have `userId=null` + tombstoned `customerEmail`, so no future account (even same email) can ever match them. Guest checkout still works (guests access their orders by order number with no session).

### 6. Admin invoice-number lookup (new capability)
- **`app/api/admin/orders/route.ts` GET (line 88-100):** add a `q` param → case-insensitive `orderNumber contains` filter, combinable with the existing `status` filter.
- **`app/admin/AdminApp.tsx` OrdersTab (line 392-408):** add a text search input wired to `GET /api/admin/orders?q=<value>`. The existing `serializeOrder` already returns the full customer snapshot (`customerName/Email/Phone/address/city`) + items + totals, so admin retrieves the complete historical order by invoice number including when the original account is deleted.

### What does NOT change
Cart, wishlist, product system, checkout UI, registration/login, admin status workflow, deactivate/isActive, notifications creation, audit logs, OrderItem/product snapshot pattern, `orderNumber` generation. All existing order/customer snapshot data preserved (backfill copies it into the new columns; nothing is overwritten or dropped).

---

### Verification (after implementation)
1. `npm run typecheck` passes.
2. Node/Prisma scenario: Account A registers → places order → assert `originalUserId/Email` set. Delete A → assert order row preserved with `userId=null`, `customerEmail` tombstoned, `originalUserId/Email` intact. Register Account B (same email) → `GET /api/orders` returns `[]`; `GET /api/notifications` returns `[]`. B places an order → list returns only B's order. Admin `GET /api/admin/orders?q=AN-…-000001` returns A's order with original snapshot.
3. Existing-data backfill check: after migration, `SELECT count(*) FROM "Order" WHERE original_user_email='' AND customer_email<>''` = 0 (no historical order missing a snapshot).
4. Guest checkout still creates an order accessible by order number with no account.