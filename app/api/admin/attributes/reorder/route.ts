import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

const reorderSchema = z
  .object({
    /** Exactly one scope: subcategory (primary) or category (fallback). */
    subcategoryId: z.number().int().positive().optional(),
    categoryId: z.number().int().positive().optional(),
    section: z.enum(["HEADER", "DESCRIPTION", "SPECIFICATIONS"]),
    orderedIds: z.array(z.number().int().positive()).max(200),
  })
  .refine((d) => (d.subcategoryId != null) !== (d.categoryId != null), {
    message: "Provide exactly one of subcategoryId or categoryId",
  });

/**
 * POST /api/admin/attributes/reorder — persists the display order of the
 * custom fields in one information area of a classification. The client
 * sends the full ordered list of field ids; displayOrder becomes the array
 * index.
 */
export async function POST(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { section, orderedIds } = parsed.data;
  const scope =
    parsed.data.subcategoryId != null
      ? { subcategoryId: parsed.data.subcategoryId }
      : { categoryId: parsed.data.categoryId!, subcategoryId: null };
  const attrs = await prisma.customAttribute.findMany({
    where: { ...scope, section, isDeleted: false },
    select: { id: true },
  });
  const liveIds = new Set(attrs.map((a) => a.id));
  // Only accept ids that genuinely belong to this classification + section.
  const validIds = orderedIds.filter((id) => liveIds.has(id));
  await prisma.$transaction(
    validIds.map((id, index) =>
      prisma.customAttribute.update({ where: { id }, data: { displayOrder: index } })
    )
  );
  await prisma.auditLog.create({
    data: {
      actorId: staff.id,
      action: "ATTRIBUTE_REORDER",
      entity: "CustomAttribute",
      entityId: String(parsed.data.subcategoryId ?? parsed.data.categoryId),
      detail: `${section}: ${validIds.join(",")}`,
    },
  });
  return NextResponse.json({ success: true, data: { reordered: validIds.length }, error: null });
}
