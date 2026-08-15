import { NextResponse } from "next/server";
import { getSessionUser, destroySession } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
 */
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { success: false, data: null, error: "Unauthorized" },
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
