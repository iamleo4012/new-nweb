import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

/**
 * GET /api/admin/audit-log — paginated audit log with search + filtering.
 * Query params: q (search), entity (filter), page, limit (max 100)
 */
export async function GET(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return forbidden();

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") || "";
  const entity = searchParams.get("entity") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { entity: { contains: q, mode: "insensitive" } },
      { detail: { contains: q, mode: "insensitive" } },
      { entityId: { contains: q, mode: "insensitive" } },
    ];
  }
  if (entity) {
    where.entity = entity;
  }

  const [logs, total, entities] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ select: { entity: true }, distinct: ["entity"], orderBy: { entity: "asc" } }),
  ]);

  // Resolve actor names
  const actorIds = [...new Set(logs.map((l) => l.actorId).filter(Boolean))] as number[];
  const actors = actorIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, email: true } })
    : [];
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  return NextResponse.json({
    success: true,
    data: {
      logs: logs.map((l) => ({
        id: l.id,
        actorId: l.actorId,
        actorName: l.actorId ? actorMap.get(l.actorId)?.name || "Unknown" : "System",
        actorEmail: l.actorId ? actorMap.get(l.actorId)?.email || "" : "",
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        detail: l.detail,
        createdAt: l.createdAt,
      })),
      entities: entities.map((e) => e.entity),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    error: null,
  });
}
