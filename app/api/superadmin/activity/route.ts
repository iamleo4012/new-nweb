import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/auth";

/**
 * GET /api/superadmin/activity — recent business events from the EXISTING
 * AuditLog table (who / what / when / target / old→new detail). The full
 * searchable browser remains the existing /admin audit-log tab.
 */
export async function GET(req: NextRequest) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
  }

  const limit = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10) || 20, 1), 100);

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      actorId: true,
      action: true,
      entity: true,
      entityId: true,
      detail: true,
      createdAt: true,
    },
  });

  // Resolve actor names in one batch (same pattern as the admin audit-log API).
  const actorIds = [...new Set(logs.map((l) => l.actorId).filter((id): id is number => id !== null))];
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true, email: true, role: true },
      })
    : [];
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  return NextResponse.json({
    success: true,
    data: {
      activity: logs.map((l) => ({
        id: l.id,
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        detail: l.detail,
        createdAt: l.createdAt,
        actor: l.actorId !== null ? actorMap.get(l.actorId) ?? null : null,
      })),
    },
    error: null,
  });
}
