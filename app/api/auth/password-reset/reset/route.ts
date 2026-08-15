import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/security";
import { createHash } from "node:crypto";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(200),
  confirm: z.string().min(8).max(200),
});

/**
 * POST /api/auth/password-reset/reset
 *
 * Validates the token, checks expiry, updates the password,
 * and invalidates the token (single-use).
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return NextResponse.json({ success: false, data: null, error: msg }, { status: 400 });
  }

  const { token, password, confirm } = parsed.data;

  if (password !== confirm) {
    return NextResponse.json({ success: false, data: null, error: "Passwords do not match" }, { status: 400 });
  }

  // Hash the incoming token to compare with stored hash
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!resetToken) {
    return NextResponse.json({ success: false, data: null, error: "Invalid or expired reset link" }, { status: 400 });
  }

  // Check if already used
  if (resetToken.usedAt) {
    return NextResponse.json({ success: false, data: null, error: "This reset link has already been used" }, { status: 400 });
  }

  // Check expiry
  if (resetToken.expiresAt < new Date()) {
    return NextResponse.json({ success: false, data: null, error: "This reset link has expired" }, { status: 400 });
  }

  // Update the user's password
  const newHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: resetToken.userId },
    data: { passwordHash: newHash },
  });

  // Invalidate the token (single-use)
  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { usedAt: new Date() },
  });

  // Invalidate all active sessions for this user (force re-login)
  await prisma.session.deleteMany({ where: { userId: resetToken.userId } });

  return NextResponse.json({
    success: true,
    data: { message: "Password updated successfully. You can now log in with your new password." },
    error: null,
  });
}
