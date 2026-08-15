import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/addresses — list saved addresses for the authenticated user.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, data: null, error: "Not authenticated" }, { status: 401 });
  }
  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { id: "desc" }],
  });
  return NextResponse.json({
    success: true,
    data: {
      addresses: addresses.map((a) => ({
        id: a.id,
        label: a.label,
        fullName: a.fullName,
        phone: a.phone,
        address: a.address,
        city: a.city,
        area: a.area,
        isDefault: a.isDefault,
      })),
    },
    error: null,
  });
}

const createSchema = z.object({
  label: z.string().max(50).optional().default("Home"),
  fullName: z.string().max(100).optional().default(""),
  phone: z.string().max(30).optional().default(""),
  address: z.string().min(3).max(500),
  city: z.string().min(2).max(100),
  area: z.string().max(100).optional().default(""),
  isDefault: z.boolean().optional().default(false),
});

/**
 * POST /api/addresses — create a new address for the authenticated user.
 */
export async function POST(req: NextRequest) {
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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  // If setting as default, unset other defaults
  if (parsed.data.isDefault) {
    await prisma.address.updateMany({ where: { userId: user.id, isDefault: true }, data: { isDefault: false } });
  }

  const addr = await prisma.address.create({
    data: {
      userId: user.id,
      label: parsed.data.label,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      address: parsed.data.address,
      city: parsed.data.city,
      area: parsed.data.area,
      isDefault: parsed.data.isDefault,
    },
  });
  return NextResponse.json({ success: true, data: { address: addr }, error: null }, { status: 201 });
}
