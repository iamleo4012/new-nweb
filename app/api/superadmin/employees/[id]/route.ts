import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireOwner, getSessionId } from "@/lib/auth";
import { hashPassword } from "@/lib/security";

/**
 * PATCH /api/superadmin/employees/[id] — edit employee details, change role,
 * activate/deactivate, reset password. SUPERADMIN only.
 *
 * Server-side safeguards (all enforced inside ONE transaction so concurrent
 * requests cannot bypass them):
 *   - an owner cannot deactivate their own account          → 409
 *   - an owner cannot change their own role                 → 409
 *   - the LAST active SUPERADMIN cannot be demoted or
 *     deactivated                                           → 409
 *   - passwords are hashed server-side, never returned and
 *     never written to the audit log
 *   - a password reset, role change or deactivation REVOKES
 *     the target's existing sessions (the JWT role claim used
 *     by the edge page gate would otherwise stay valid for up
 *     to 30 days); when the owner rotates their OWN password
 *     the current session survives, every other session dies
 */

const EMPLOYEE_ROLES = ["ADMIN", "SUPERADMIN"] as const;

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
  role: z.enum(EMPLOYEE_ROLES).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(128).optional(),
});

/**
 * Count active SUPERADMINs inside the caller's transaction, locking the
 * matching rows (FOR UPDATE) so two concurrent demotions/deactivations
 * serialize: the second transaction re-evaluates the count after the first
 * commits and correctly observes the last-owner condition.
 */
async function lockedActiveSuperadminCount(tx: Prisma.TransactionClient): Promise<number> {
  // FOR UPDATE is not allowed with aggregates, so lock the qualifying ROWS
  // and count them afterwards: two concurrent demotions/deactivations
  // serialize on the row locks and the second re-observes the new count.
  const rows = (await tx.$queryRawUnsafe(
    `SELECT id FROM "User" WHERE role = 'SUPERADMIN' AND "isActive" = true FOR UPDATE`
  )) as Array<{ id: number }>;
  return rows.length;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const owner = await requireOwner();
  if (!owner) return forbidden();

  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ success: false, data: null, error: "Invalid employee id" }, { status: 400 });
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

  // Self-protection: an owner may update their own profile fields but can
  // never deactivate themselves or change their own role from here.
  if (owner.id === id && (input.isActive !== undefined || input.role !== undefined)) {
    return conflict("You cannot change your own role or active status");
  }

  try {
    // Read BEFORE the transaction: the actor's own session id, so a
    // self-password-rotation can preserve it while every other session dies.
    const currentSid = await getSessionId();
    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id } });
      if (!target || (target.role !== "ADMIN" && target.role !== "SUPERADMIN")) {
        throw new TxError(404, "Employee not found");
      }

      /* ---------------- Safeguards (before any write) ---------------- */
      const roleChanges = input.role !== undefined && input.role !== target.role;
      const deactivates = input.isActive === false && target.isActive;

      if ((roleChanges && target.role === "SUPERADMIN") || (deactivates && target.role === "SUPERADMIN")) {
        const activeOwners = await lockedActiveSuperadminCount(tx);
        if (activeOwners <= 1) {
          throw new TxError(409, "Cannot demote or deactivate the last active SUPERADMIN");
        }
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
      if (roleChanges) data.role = input.role;
      if (input.isActive !== undefined && input.isActive !== target.isActive)
        data.isActive = input.isActive;
      if (input.password !== undefined) data.passwordHash = await hashPassword(input.password);

      if (Object.keys(data).length === 0) {
        return { updated: target, audits: [] as Array<{ action: string; detail: string }> };
      }

      /* ---------------- Session revocation ----------------
       * Password reset, role change and deactivation must kill the
       * target's live sessions (30-day tokens). When the owner rotates
       * their own password the CURRENT session is preserved. */
      const securityChange =
        data.passwordHash !== undefined || roleChanges || (input.isActive !== undefined && input.isActive !== target.isActive);
      let revokedSessions = 0;
      if (securityChange) {
        const selfChange = owner.id === id;
        const keepSid = selfChange ? currentSid : null;
        const where = keepSid
          ? { userId: id, NOT: { id: keepSid } }
          : { userId: id };
        revokedSessions = (await tx.session.deleteMany({ where })).count;
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
        audits.push({ action: "EMPLOYEE_UPDATE", detail: profileChanges.join("; ") });
      }

      if (roleChanges) {
        audits.push({
          action: "EMPLOYEE_ROLE_CHANGE",
          detail: `role: ${target.role} -> ${input.role}${revokedSessions ? `; ${revokedSessions} session(s) revoked` : ""}`,
        });
      }
      if (input.isActive !== undefined && input.isActive !== target.isActive) {
        audits.push({
          action: input.isActive ? "EMPLOYEE_REACTIVATE" : "EMPLOYEE_DEACTIVATE",
          detail: `email=${updated.email}${revokedSessions ? `; ${revokedSessions} session(s) revoked` : ""}`,
        });
      }
      if (input.password !== undefined) {
        // Only the fact of the reset is recorded — no secret material, ever.
        audits.push({
          action: "EMPLOYEE_PASSWORD_RESET",
          detail: `email=${updated.email}${revokedSessions ? `; ${revokedSessions} session(s) revoked` : ""}`,
        });
      }

      for (const a of audits) {
        await tx.auditLog.create({
          data: { actorId: owner.id, action: a.action, entity: "User", entityId: String(id), detail: a.detail },
        });
      }

      return { updated, audits };
    });

    return NextResponse.json({
      success: true,
      data: { employee: result.updated, auditEvents: result.audits },
      error: null,
    });
  } catch (err) {
    if (err instanceof TxError) {
      return NextResponse.json({ success: false, data: null, error: err.message }, { status: err.status });
    }
    console.error("employee PATCH failed", err);
    return NextResponse.json({ success: false, data: null, error: "Update failed" }, { status: 500 });
  }
}

/** Internal control-flow error carrying an HTTP status through $transaction. */
class TxError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
