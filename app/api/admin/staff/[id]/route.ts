import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, getSessionId } from "@/lib/auth";
import { hashPassword } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/staff/[id] — edit staff details, activate/deactivate,
 * reset password. ADMIN only, STAFF targets only.
 *
 * Server-side safeguards (all enforced inside ONE transaction so concurrent
 * requests cannot bypass them):
 *   - only accounts whose role is already STAFF can be modified here →
 *     404 otherwise (ADMIN/CUSTOMER/SUPERADMIN accounts are unreachable)
 *   - there is NO role field in the schema: role changes are impossible
 *     through this endpoint, so staff cannot promote themselves or anyone
 *     else, and a second ADMIN can never be created
 *   - passwords are hashed server-side, never returned and never written
 *     to the audit log
 *   - a password reset or deactivation REVOKES the target's existing
 *     sessions (the JWT role claim used by the edge page gate would
 *     otherwise stay valid for up to 30 days)
 */

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}
function conflict(error: string) {
  return NextResponse.json({ success: false, data: null, error }, { status: 409 });
}

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z.string().trim().max(40).optional(),
  designation: z.string().trim().max(120).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(128).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return forbidden();

  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ success: false, data: null, error: "Invalid staff id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.success ? "No changes supplied" : parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const input = parsed.data;

  try {
    // Read BEFORE the transaction: the actor's own session id (kept alive if
    // the admin ever rotates their own password through another path).
    const currentSid = await getSessionId();
    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id } });
      if (!target || target.role !== "STAFF") {
        throw new TxError(404, "Staff account not found");
      }

      if (input.email && input.email !== target.email) {
        const clash = await tx.user.findUnique({ where: { email: input.email }, select: { id: true } });
        if (clash) throw new TxError(409, "An account with this email already exists");
      }

      /* ---------------- Apply the update ---------------- */
      const data: Record<string, unknown> = {};
      if (input.name !== undefined && input.name !== target.name) data.name = input.name;
      if (input.email !== undefined && input.email !== target.email) data.email = input.email;
      if (input.phone !== undefined && input.phone !== target.phone) data.phone = input.phone;
      if (input.designation !== undefined && input.designation !== target.designation)
        data.designation = input.designation;
      if (input.isActive !== undefined && input.isActive !== target.isActive)
        data.isActive = input.isActive;
      if (input.password !== undefined) data.passwordHash = await hashPassword(input.password);

      if (Object.keys(data).length === 0) {
        return { updated: target, audits: [] as Array<{ action: string; detail: string }> };
      }

      /* ---------------- Session revocation ----------------
       * Password reset and deactivation must kill the target's live sessions
       * (30-day tokens). The actor is an ADMIN and the target is STAFF, so
       * the current session is never the target's — revoke unconditionally. */
      const securityChange =
        data.passwordHash !== undefined || (input.isActive !== undefined && input.isActive !== target.isActive);
      let revokedSessions = 0;
      if (securityChange) {
        revokedSessions = (await tx.session.deleteMany({ where: { userId: id } })).count;
      }

      const updated = await tx.user.update({
        where: { id },
        data,
        select: {
          id: true, name: true, email: true, phone: true,
          role: true, designation: true, isActive: true, createdAt: true, updatedAt: true,
        },
      });

      /* ---------------- Audit trail (old -> new, never secrets) ------- */
      const audits: Array<{ action: string; detail: string }> = [];

      const profileChanges: string[] = [];
      if (data.name !== undefined) profileChanges.push(`name: ${target.name} -> ${data.name}`);
      if (data.email !== undefined) profileChanges.push(`email: ${target.email} -> ${data.email}`);
      if (data.phone !== undefined) profileChanges.push(`phone: ${target.phone} -> ${data.phone}`);
      if (data.designation !== undefined)
        profileChanges.push(`designation: ${target.designation || "(none)"} -> ${data.designation || "(none)"}`);
      if (profileChanges.length) {
        audits.push({ action: "STAFF_UPDATE", detail: profileChanges.join("; ") });
      }

      if (input.isActive !== undefined && input.isActive !== target.isActive) {
        audits.push({
          action: input.isActive ? "STAFF_REACTIVATE" : "STAFF_DEACTIVATE",
          detail: `email=${updated.email}${revokedSessions ? `; ${revokedSessions} session(s) revoked` : ""}`,
        });
      }
      if (input.password !== undefined) {
        // Only the fact of the reset is recorded — no secret material, ever.
        audits.push({
          action: "STAFF_PASSWORD_RESET",
          detail: `email=${updated.email}${revokedSessions ? `; ${revokedSessions} session(s) revoked` : ""}`,
        });
      }

      for (const a of audits) {
        await tx.auditLog.create({
          data: { actorId: admin.id, action: a.action, entity: "User", entityId: String(id), detail: a.detail },
        });
      }

      return { updated, audits };
    });

    return NextResponse.json({
      success: true,
      data: { staff: result.updated, auditEvents: result.audits },
      error: null,
    });
  } catch (err) {
    if (err instanceof TxError) {
      return NextResponse.json({ success: false, data: null, error: err.message }, { status: err.status });
    }
    console.error("staff PATCH failed", err);
    return NextResponse.json({ success: false, data: null, error: "Update failed" }, { status: 500 });
  }
}

/** Internal control-flow error carrying an HTTP status through $transaction. */
class TxError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return forbidden();

  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ success: false, data: null, error: "Invalid staff id" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, phone: true,
      role: true, designation: true, isActive: true, createdAt: true, updatedAt: true,
    },
  });
  if (!user || user.role !== "STAFF") {
    return NextResponse.json({ success: false, data: null, error: "Staff account not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: { staff: user }, error: null });
}
