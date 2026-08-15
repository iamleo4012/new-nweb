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
 * and sends the email via Resend. Returns an error if the email
 * is not registered or the account is inactive.
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

  // Return an error if the email is not registered or the account is inactive
  if (!user || !user.isActive) {
    return NextResponse.json({
      success: false,
      data: null,
      error: "No account was found with this email address.",
    }, { status: 404 });
  }

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

  // Send the email (fire-and-forget in dev if no API key)
  console.log(`[password-reset] Sending reset email to=${user.email} name=${user.name}`);
  const sent = await sendPasswordResetEmail(user.email, user.name, rawToken);
  if (!sent) {
    console.error(`[password-reset] Email NOT sent to=${user.email}. Check RESEND_API_KEY and EMAIL_FROM configuration.`);
  } else {
    console.log(`[password-reset] Email sent successfully to=${user.email}`);
  }

  return NextResponse.json({
    success: true,
    data: { message: "If an account exists for this email, a reset link has been sent." },
    error: null,
  });
}
