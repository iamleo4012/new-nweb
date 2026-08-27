import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications — customer notification inbox.
 * Returns notifications for the authenticated user, most recent first.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, data: null, error: "Not authenticated" }, { status: 401 });
  }

  // Notifications are tied to the account (Notification.userId is set to the
  // order's userId when created). Filter by the current account only — never by
  // email — so a reused email cannot surface a deleted account's notifications.
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { order: { select: { orderNumber: true } } },
  });

  return NextResponse.json({
    success: true,
    data: {
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        message: n.message,
        orderNumber: n.order?.orderNumber ?? null,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
    },
    error: null,
  });
}

/**
 * PATCH /api/notifications — mark notifications as read.
 * Body: { id: number } or { all: true }
 */
export async function PATCH(req: Request) {
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

  const { id, all } = body as { id?: number; all?: boolean };

  if (all) {
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  } else if (id !== undefined) {
    if (!Number.isInteger(id)) {
      return NextResponse.json({ success: false, data: null, error: "Invalid notification id" }, { status: 400 });
    }
    // Ownership is enforced in the WHERE clause: a notification that does not
    // exist OR belongs to another user updates zero rows — 404 either way, so
    // existence of other users' notifications is never disclosed.
    const result = await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { readAt: new Date() },
    });
    if (result.count === 0) {
      return NextResponse.json({ success: false, data: null, error: "Notification not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ success: true, data: null, error: null });
}
