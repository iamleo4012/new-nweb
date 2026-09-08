import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStaff, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) return forbidden();

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ success: false, data: null, error: "Invalid id" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ success: false, data: null, error: "Customer not found" }, { status: 404 });
  }

  const [addresses, orders] = await Promise.all([
    prisma.address.findMany({
      where: { userId },
      orderBy: { id: "asc" },
    }),
    prisma.order.findMany({
      where: { OR: [{ userId }, { customerEmail: user.email }] },
      include: { items: true, statusHistory: { orderBy: { createdAt: "asc" } } },
      orderBy: { id: "desc" },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      user,
      addresses: addresses.map((a) => ({ ...a })),
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        subtotal: Number(o.subtotal),
        shipping: Number(o.shipping),
        total: Number(o.total),
        currency: o.currency,
        createdAt: o.createdAt,
        itemCount: o.items.length,
        items: o.items.map((i) => ({
          id: i.id,
          name: i.name,
          slug: i.slug,
          price: Number(i.price),
          quantity: i.quantity,
        })),
        timeline: o.statusHistory.map((h) => ({
          id: h.id,
          status: h.status,
          note: h.note,
          createdAt: h.createdAt,
        })),
      })),
    },
    error: null,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Deactivating a user is a destructive, privilege-sensitive action.
  const admin = await requireAdmin();
  if (!admin) return forbidden();

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ success: false, data: null, error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid JSON body" }, { status: 400 });
  }

  // Strict boolean validation — the previous unvalidated cast meant a body
  // of { "isActive": "false" } (truthy string) silently ACTIVATED the account.
  const parsed = z.object({ isActive: z.boolean().optional() }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: "isActive must be a boolean" }, { status: 400 });
  }
  const { isActive } = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { id: userId } });
      if (!existing) {
        throw new TxError(404, "Customer not found");
      }

      // Role hierarchy: legacy SUPERADMIN rows still exist in the database
      // (the role is removed from production, not from historical data).
      // Customer management must never modify them — this denies ADMIN
      // (and anyone else) reaching such an account through this endpoint.
      if (existing.role === "SUPERADMIN") {
        throw new TxError(403, "Forbidden");
      }

      // Self-protection: deactivating your own account here would lock you out
      // with no undo path (a deactivated user cannot sign in to reactivate).
      if (admin.id === userId) {
        throw new TxError(409, "You cannot change your own active status");
      }

      const deactivates = isActive === false && existing.isActive;

      // Last-active-ADMIN guard, mirroring the SUPERADMIN protection in the
      // employee system: rows are locked (FOR UPDATE) so concurrent
      // deactivations serialize and the second re-observes the new count.
      if (deactivates && existing.role === "ADMIN") {
        const rows = (await tx.$queryRawUnsafe(
          `SELECT id FROM "User" WHERE role = 'ADMIN' AND "isActive" = true FOR UPDATE`
        )) as Array<{ id: number }>;
        if (rows.length <= 1) {
          throw new TxError(409, "Cannot deactivate the last active ADMIN");
        }
      }

      if (isActive === undefined || isActive === existing.isActive) {
        return { user: existing, revokedSessions: 0, changed: false };
      }

      // A deactivation must end the account's live sessions immediately —
      // the 30-day tokens would otherwise keep working until their expiry.
      let revokedSessions = 0;
      if (deactivates) {
        revokedSessions = (await tx.session.deleteMany({ where: { userId } })).count;
      }

      const user = await tx.user.update({
        where: { id: userId },
        data: { isActive },
        select: { id: true, email: true, name: true, phone: true, role: true, isActive: true },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "CUSTOMER_UPDATE",
          entity: "User",
          entityId: String(userId),
          // Record the RESULTING state (the old detail logged the raw request
          // value, which could be "undefined").
          detail: `isActive=${user.isActive}${revokedSessions ? `; ${revokedSessions} session(s) revoked` : ""}`,
        },
      });

      return { user, revokedSessions, changed: true };
    });

    return NextResponse.json({ success: true, data: { user: updated.user }, error: null });
  } catch (err) {
    if (err instanceof TxError) {
      const response = NextResponse.json({ success: false, data: null, error: err.message }, { status: err.status });
      return response;
    }
    console.error("customer PATCH failed", err);
    return NextResponse.json({ success: false, data: null, error: "Update failed" }, { status: 500 });
  }
}

/** Internal control-flow error carrying an HTTP status through $transaction. */
class TxError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
