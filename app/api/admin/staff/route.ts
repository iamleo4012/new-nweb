import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * Staff management — ADMIN only (requireAdmin on every handler).
 *
 * The production role model has exactly ONE active ADMIN; this endpoint can
 * therefore only ever create/manage STAFF accounts. There is deliberately no
 * role field in any schema here: promoting a user to ADMIN (or any other
 * role) is not possible through the staff system.
 */

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

/* ------------------------------------------------------------------ */
/* GET /api/admin/staff — list staff accounts                          */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return forbidden();

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const active = sp.get("active") ?? "";
  const designation = sp.get("designation")?.trim() ?? "";
  const sort = sp.get("sort") === "oldest" ? "oldest" : "newest";

  const where: Record<string, unknown> = { role: "STAFF" };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (active === "true" || active === "false") where.isActive = active === "true";
  if (designation) where.designation = { contains: designation, mode: "insensitive" };

  const [staff, designations] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" },
      take: 200,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        designation: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.findMany({
      where: { role: "STAFF", designation: { not: "" } },
      distinct: ["designation"],
      select: { designation: true },
      orderBy: { designation: "asc" },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: { staff, designations: designations.map((d) => d.designation) },
    error: null,
  });
}

/* ------------------------------------------------------------------ */
/* POST /api/admin/staff — create a STAFF account                      */
/* ------------------------------------------------------------------ */

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().max(40).optional().default(""),
  password: z.string().min(8).max(128), // hashed server-side; never stored or logged raw
  designation: z.string().trim().max(120).optional().default(""),
  isActive: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { name, email, phone, password, designation, isActive } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json(
      { success: false, data: null, error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  // Create + audit inside one transaction (security-sensitive mutation).
  // role is hardcoded to STAFF — the schema cannot express anything else.
  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        phone,
        designation,
        role: "STAFF",
        isActive,
        passwordHash: await hashPassword(password),
      },
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, designation: true, isActive: true, createdAt: true, updatedAt: true,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        action: "STAFF_CREATE",
        entity: "User",
        entityId: String(user.id),
        detail: `email=${email}; designation=${designation || "(none)"}`,
      },
    });
    return user;
  });

  return NextResponse.json({ success: true, data: { staff: created }, error: null }, { status: 201 });
}
