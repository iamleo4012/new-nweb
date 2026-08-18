import type { Prisma } from "@prisma/client";

/**
 * Shared serializer for the dynamic PIM custom-field data.
 * Used by the public product APIs (/api/catalog, /api/products,
 * /api/products/[slug]) so they all expose the same additive, backward-
 * compatible shape:
 *
 *   customFields:   { "Smoothness": "Very Smooth", ... }   flat name → value
 *   customSections: { header: [...], description: [...], specifications: [...] }
 *   relatedIds:     [slug, ...]  admin-selected related products (ordered)
 *
 * Only non-empty values for live (non-deleted) attributes are emitted, so
 * products without custom data look exactly like they did before this system.
 */

export const customFieldsInclude = {
  customValues: { include: { attribute: true } },
  relatedFrom: {
    orderBy: { displayOrder: "asc" },
    include: { related: { select: { slug: true } } },
  },
} satisfies Prisma.ProductInclude;

type CustomFieldProduct = Prisma.ProductGetPayload<{ include: typeof customFieldsInclude }>;

export type CustomSectionEntry = { name: string; value: string; type: string };
export type CustomFieldsPayload = {
  customFields: Record<string, string>;
  customSections: {
    header: CustomSectionEntry[];
    description: CustomSectionEntry[];
    specifications: CustomSectionEntry[];
  };
  relatedIds: string[];
};

export function customFieldsPayload(p: CustomFieldProduct): CustomFieldsPayload {
  const live = p.customValues
    .filter((v) => !v.attribute.isDeleted && v.value.trim() !== "")
    .sort(
      (a, b) =>
        a.attribute.displayOrder - b.attribute.displayOrder || a.attribute.id - b.attribute.id
    );
  const entry = (v: (typeof live)[number]): CustomSectionEntry => ({
    name: v.attribute.name,
    value: v.value,
    type: v.attribute.fieldType,
  });
  const sections = {
    header: live.filter((v) => v.attribute.section === "HEADER").map(entry),
    description: live.filter((v) => v.attribute.section === "DESCRIPTION").map(entry),
    specifications: live.filter((v) => v.attribute.section === "SPECIFICATIONS").map(entry),
  };
  const customFields = Object.fromEntries(live.map((v) => [v.attribute.name, v.value]));
  const relatedIds = p.relatedFrom.map((r) => r.related.slug);
  return { customFields, customSections: sections, relatedIds };
}
