import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/security";
import { rateLimit } from "@/lib/security";
import { sendPasswordResetEmail } from "@/lib/email";
import { randomBytes, createHash } from "node:crypto";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
});

/**
 * POST /api/auth/password-reset/request
 *
 * Generates a secure reset token, stores only the hashed version,
 * and sends the email via Resend. The response is identical whether or not
 * the email is registered (anti-enumeration); inactive accounts are a no-op.
 */
export async function POST(req: NextRequest) {
  // Rate limit: 3 requests per 10 minutes per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`pwreset:${ip}`, { max: 3, windowMs: 10 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // Return same success-like message to avoid email enumeration
    return NextResponse.json({
      success: true,
      data: { message: "If an account exists for this email, a reset link has been sent." },
      error: null,
    });
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Anti-enumeration: the response is IDENTICAL whether or not the email is
  // registered/active. A token is created and an email sent only when the
  // account exists; otherwise this is a silent no-op with the same shape,
  // timing profile kept reasonable by the bcrypt work below.
  if (user && user.isActive) {
    // Generate a secure random token (32 bytes = 64 hex chars)
    const rawToken = randomBytes(32).toString("hex");
    // Store only the SHA-256 hash of the token
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Invalidate any previous tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Store the hashed token
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    // SECURITY: never log the raw token/link or the target address.
    const sent = await sendPasswordResetEmail(user.email, user.name, rawToken);
    if (!sent) {
      console.error("[password-reset] Email delivery failed — check RESEND_API_KEY and EMAIL_FROM configuration.");
    }
  } else {
    // Equalise timing with the real path (token gen + hash + DB writes) so a
    // slow response does not reveal account existence.
    await hashPassword("timing-equalisation");
  }

  return NextResponse.json({
    success: true,
    data: { message: "If an account exists for this email, a reset link has been sent." },
    error: null,
  });
}
