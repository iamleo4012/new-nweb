import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Shared serializer for the dynamic PIM custom-field data.
 * Used by the public product APIs (/api/catalog, /api/products,
 * /api/products/[slug]) so they all expose the same additive, backward-
 * compatible shape:
 *
 *   customFields:   { "Smoothness": "Very Smooth", ... }   flat name → value (EN)
 *   customSections: { header: [...], description: [...], specifications: [...] }
 *   relatedIds:     [slug, ...]  admin-selected related products (ordered)
 *
 * Section entries additionally carry `nameAr` / `valueAr` (dynamic-spec
 * bilingual system — Arabic lives in the i18n side tables; empty string
 * means "not translated, fall back to English" at render time).
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

export type CustomSectionEntry = {
  name: string;
  nameAr: string;
  value: string;
  valueAr: string;
  type: string;
  /** SELECT attributes: EN option → Arabic label (for language-aware dropdowns). */
  optionsAr: Record<string, string>;
  multiSelect: boolean;
};
export type CustomFieldsPayload = {
  customFields: Record<string, string>;
  customSections: {
    header: CustomSectionEntry[];
    description: CustomSectionEntry[];
    specifications: CustomSectionEntry[];
  };
  relatedIds: string[];
};

/** i18n lookup maps for a batch of products (bulk-loaded, no N+1). */
export interface CustomI18n {
  /** attributeId → Arabic name */
  attrNameAr: Map<number, string>;
  /** attributeId → multiSelect flag */
  attrMulti: Set<number>;
  /** `${attributeId}:${optionEn}` → Arabic option label */
  optionAr: Map<string, string>;
  /** `${productId}:${attributeId}` → Arabic value */
  valueAr: Map<string, string>;
}

const EMPTY_I18N: CustomI18n = { attrNameAr: new Map(), attrMulti: new Set(), optionAr: new Map(), valueAr: new Map() };

/**
 * Bulk-load the bilingual side tables for a set of products (all attribute
 * metadata + only these products' values). Pass `attributeIds` to scope the
 * attribute/option maps when the caller already knows the involved attributes.
 */
export async function loadCustomI18n(productIds: number[], attributeIds?: number[]): Promise<CustomI18n> {
  if (productIds.length === 0 && !attributeIds) return EMPTY_I18N;
  const [attrI18n, optionI18n, valueI18n] = await Promise.all([
    prisma.attributeI18n.findMany(attributeIds ? { where: { attributeId: { in: attributeIds } } } : undefined),
    prisma.attributeOptionI18n.findMany(
      attributeIds ? { where: { attributeId: { in: attributeIds } } } : undefined
    ),
    productIds.length
      ? prisma.productCustomValueI18n.findMany({ where: { productId: { in: productIds } } })
      : Promise.resolve([]),
  ]);
  return {
    attrNameAr: new Map(attrI18n.map((a) => [a.attributeId, a.nameAr])),
    attrMulti: new Set(attrI18n.filter((a) => a.multiSelect).map((a) => a.attributeId)),
    optionAr: new Map(optionI18n.map((o) => [`${o.attributeId}:${o.optionEn}`, o.optionAr])),
    valueAr: new Map(valueI18n.map((v) => [`${v.productId}:${v.attributeId}`, v.valueAr])),
  };
}

export function customFieldsPayload(p: CustomFieldProduct, i18n: CustomI18n = EMPTY_I18N): CustomFieldsPayload {
  const live = p.customValues
    .filter((v) => !v.attribute.isDeleted && v.value.trim() !== "")
    .sort(
      (a, b) =>
        a.attribute.displayOrder - b.attribute.displayOrder || a.attribute.id - b.attribute.id
    );
  const entry = (v: (typeof live)[number]): CustomSectionEntry => {
    const optionsAr: Record<string, string> = {};
    if (v.attribute.fieldType === "SELECT") {
      for (const opt of v.attribute.options) {
        const ar = i18n.optionAr.get(`${v.attribute.id}:${opt}`);
        if (ar) optionsAr[opt] = ar;
      }
    }
    return {
      name: v.attribute.name,
      nameAr: i18n.attrNameAr.get(v.attribute.id) ?? "",
      value: v.value,
      valueAr: i18n.valueAr.get(`${p.id}:${v.attribute.id}`) ?? "",
      type: v.attribute.fieldType,
      optionsAr,
      multiSelect: i18n.attrMulti.has(v.attribute.id),
    };
  };
  const sections = {
    header: live.filter((v) => v.attribute.section === "HEADER").map(entry),
    description: live.filter((v) => v.attribute.section === "DESCRIPTION").map(entry),
    specifications: live.filter((v) => v.attribute.section === "SPECIFICATIONS").map(entry),
  };
  const customFields = Object.fromEntries(live.map((v) => [v.attribute.name, v.value]));
  const relatedIds = p.relatedFrom.map((r) => r.related.slug);
  return { customFields, customSections: sections, relatedIds };
}
