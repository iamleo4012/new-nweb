import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, destroySession } from "@/lib/auth";
import { verifyPassword, rateLimit } from "@/lib/security";
import { prisma } from "@/lib/db";

const bodySchema = z.object({ password: z.string().min(1) });

/**
 * DELETE /api/auth/delete-account
 *
 * Permanently deletes the currently logged-in user and all user-owned data
 * that has a cascade relation (sessions, cart, wishlist, addresses,
 * password-reset tokens). Orders are PRESERVED for business/legal records —
 * their snapshot columns (originalUserId / originalUserEmail / customerName
 * / Phone / address / city) keep the historical customer identifiable to
 * admin. The live ownership columns are detached from any future account:
 *   - userId is set to null (default SetNull behaviour, made explicit here)
 *   - customerEmail is tombstoned ("deleted+<id>+<email>") so a new account
 *     reusing the same email can NEVER match these orders through any
 *     email-based lookup.
 * The session cookie is destroyed after the delete succeeds.
 *
 * SECURITY: the account password must be re-entered in the request body —
 * a hijacked session cookie alone can no longer destroy the account. The
 * attempt is rate-limited per account to prevent password brute force
 * through this endpoint.
 */
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 },
    );
  }

  // Rate limit per account (not IP): 5 attempts / 10 minutes.
  const rl = rateLimit(`delacct:${user.id}`, { max: 5, windowMs: 10 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "Please enter your password to confirm the deletion." },
      { status: 400 },
    );
  }
  const passwordOk = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!passwordOk) {
    return NextResponse.json(
      { success: false, data: null, error: "Incorrect password — your account was NOT deleted." },
      { status: 401 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Detach the user's orders from any future account while preserving the
      // rows and their historical snapshot for admin/legal records. The
      // tombstoned customerEmail cannot match a real login email, and
      // originalUserId/originalUserEmail (set at checkout) are untouched.
      await tx.order.updateMany({
        where: { OR: [{ userId: user.id }, { customerEmail: user.email }] },
        data: { userId: null, customerEmail: `deleted+${user.id}+${user.email}` },
      });

      // Cascade-deletes: Session, CartItem, WishlistItem, Address,
      // PasswordResetToken. Orders keep their rows (userId → null above).
      await tx.user.delete({ where: { id: user.id } });
    });

    // Session cookie must be cleared after the DB user is gone.
    await destroySession();

    return NextResponse.json({ success: true, data: null, error: null });
  } catch (error) {
    console.error("delete-account failed:", error);
    return NextResponse.json(
      { success: false, data: null, error: "Failed to delete account" },
      { status: 500 },
    );
  }
}
