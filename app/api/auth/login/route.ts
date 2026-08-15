import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, publicUser } from "@/lib/auth";
import { verifyPassword } from "@/lib/security";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: "Invalid email or password" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
    // Generic message — no user-enumeration leak.
    return NextResponse.json({ success: false, data: null, error: "Invalid email or password" }, { status: 401 });
  }

  await createSession(user.id, user.role);
  return NextResponse.json({ success: true, data: { user: publicUser(user) }, error: null });
}
