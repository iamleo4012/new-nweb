import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { hashPassword } from "@/lib/security";

/**
 * Employee management — SUPERADMIN only (requireOwner on every handler).
 *
 * Supported employee roles for this phase: ADMIN and SUPERADMIN ONLY.
 * STAFF is intentionally absent from every schema, filter and response here.
 */

/** The only roles the employee system may create/manage. */
const EMPLOYEE_ROLES = ["ADMIN", "SUPERADMIN"] as const;

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

/* ------------------------------------------------------------------ */
/* GET /api/superadmin/employees — list with search/filter/sort         */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  const owner = await requireOwner();
  if (!owner) return forbidden();

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const role = sp.get("role") ?? "";
  const active = sp.get("active") ?? "";
  const designation = sp.get("designation")?.trim() ?? "";
  const sort = sp.get("sort") === "oldest" ? "oldest" : "newest";

  const where: Record<string, unknown> = {
    // Employees only — customers are managed in the existing admin panel.
    role: { in: [...EMPLOYEE_ROLES] },
  };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (role === "ADMIN" || role === "SUPERADMIN") where.role = role;
  if (active === "true" || active === "false") where.isActive = active === "true";
  if (designation) where.designation = { contains: designation, mode: "insensitive" };

  const employees = await prisma.user.findMany({
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
  });

  const designations = await prisma.user.findMany({
    where: { role: { in: [...EMPLOYEE_ROLES] }, designation: { not: "" } },
    distinct: ["designation"],
    select: { designation: true },
    orderBy: { designation: "asc" },
  });

  return NextResponse.json({
    success: true,
    data: { employees, designations: designations.map((d) => d.designation) },
    error: null,
  });
}

/* ------------------------------------------------------------------ */
/* POST /api/superadmin/employees — create ADMIN or SUPERADMIN          */
/* ------------------------------------------------------------------ */

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().max(40).optional().default(""),
  password: z.string().min(8).max(128), // hashed server-side; never stored or logged raw
  designation: z.string().trim().max(120).optional().default(""),
  role: z.enum(EMPLOYEE_ROLES),
  isActive: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  const owner = await requireOwner();
  if (!owner) return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { name, email, phone, password, designation, role, isActive } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json(
      { success: false, data: null, error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  // Create + audit inside one transaction (security-sensitive mutation).
  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        phone,
        designation,
        role,
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
        actorId: owner.id,
        action: "EMPLOYEE_CREATE",
        entity: "User",
        entityId: String(user.id),
        detail: `email=${email}; role=${role}; designation=${designation || "(none)"}`,
      },
    });
    return user;
  });

  return NextResponse.json({ success: true, data: { employee: created }, error: null }, { status: 201 });
}
