import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, publicUser, createSession, destroySession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/security";

const updateSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().transform((v) => v.toLowerCase()),
  phone: z.string().max(30).optional().default(""),
  password: z.string().min(8).max(200).optional(),
  // Required only when the email is being changed — re-verifies the caller
  // still controls the account before a privilege-sensitive field changes.
  currentPassword: z.string().min(1).max(200).optional(),
});

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    // Return 200 with guest flag so the storefront treats this as Guest Mode
    // rather than logging a console error. The PATCH endpoint still returns
    // 401 for unauthenticated profile changes.
    return NextResponse.json({ success: true, data: { user: null, guest: true }, error: null });
  }
  return NextResponse.json({ success: true, data: { user: publicUser(user), guest: false }, error: null });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, data: null, error: "Not authenticated" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { name, email, phone, password, currentPassword } = parsed.data;

  // Email is a privilege-sensitive field. Require the current password to be
  // re-verified before allowing a change.
  if (email !== user.email) {
    if (!currentPassword) {
      return NextResponse.json(
        { success: false, data: null, error: "Current password is required to change your email address" },
        { status: 400 }
      );
    }
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ success: false, data: null, error: "Current password is incorrect" }, { status: 403 });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== user.id) {
      return NextResponse.json(
        { success: false, data: null, error: "An account with this email already exists" },
        { status: 409 }
      );
    }
  }

  // Password change also requires verifying the current password first.
  if (password) {
    if (!currentPassword) {
      return NextResponse.json(
        { success: false, data: null, error: "Current password is required to change your password" },
        { status: 400 }
      );
    }
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ success: false, data: null, error: "Current password is incorrect" }, { status: 403 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      email,
      phone,
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    },
  });

  // If the password changed, invalidate all other sessions by destroying the
  // current session and issuing a fresh one with the updated credentials.
  if (password) {
    await destroySession();
    await createSession(updated.id, updated.role);
  }

  return NextResponse.json({ success: true, data: { user: publicUser(updated) }, error: null });
}
