import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSessionUser, publicUser } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().transform((v) => v.toLowerCase()),
  phone: z.string().max(30).optional().default(""),
  password: z.string().min(8).max(200).optional(),
});

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, data: null, error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ success: true, data: { user: publicUser(user) }, error: null });
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
  const { name, email, phone, password } = parsed.data;
  if (email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== user.id) {
      return NextResponse.json(
        { success: false, data: null, error: "An account with this email already exists" },
        { status: 409 }
      );
    }
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      email,
      phone,
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
  });
  return NextResponse.json({ success: true, data: { user: publicUser(updated) }, error: null });
}
