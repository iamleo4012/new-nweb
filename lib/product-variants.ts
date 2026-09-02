/**
 * Customer-safe product variant derivation.
 *
 * Products sharing a non-empty classCode belong to the same customer-facing
 * product family (see the internal Product Class field in the admin). This
 * module derives short, human-friendly option labels for siblings WITHOUT
 * ever exposing the internal class code itself.
 *
 * Label derivation priority:
 *   1. A spec whose label matches a variation keyword (Capacity, Size,
 *      Length, Width, Diameter, Power, Volume, Weight, Color, Colour) —
 *      use the spec VALUE as the label.
 *   2. Linked color names (from the ProductColor join).
 *   3. The differentiating part of the product names (strip the common
 *      prefix and suffix shared by all siblings).
 *   4. Fallback: the full product name (clean, never broken or empty).
 */

/** Spec label keywords that indicate a customer-facing variation axis. */
const VARIANT_SPEC_KEYWORDS = [
  "capacity", "size", "length", "width", "diameter", "depth",
  "power", "volume", "weight", "color", "colour", "height",
] as const;

export interface VariantInput {
  slug: string;
  name: string;
  classCode: string;
  specs: unknown; // Json column — array of {label, value, note}
  colors?: Array<{ name: string }>;
}

export interface VariantOption {
  id: string;         // product slug (public identifier, NOT classCode)
  label: string;      // customer-facing short label
  isCurrent: boolean;
}

/** Extract a short variant label from one product's specs/colors. */
function deriveLabel(p: VariantInput, all: VariantInput[]): string {
  // 1. Spec-based: find a spec whose label matches a variation keyword
  const specs = Array.isArray(p.specs)
    ? (p.specs as Array<{ label?: unknown; value?: unknown }>)
    : [];
  for (const s of specs) {
    const label = String(s?.label ?? "").toLowerCase().trim();
    const value = String(s?.value ?? "").trim();
    if (!value) continue;
    if (VARIANT_SPEC_KEYWORDS.some((k) => label.includes(k))) {
      return value;
    }
  }

  // 2. Color-based: if this product has linked colors, use their names
  if (p.colors && p.colors.length > 0) {
    const names = p.colors.map((c) => c.name).filter(Boolean);
    if (names.length > 0) return names.join(", ");
  }

  // 3. Name-diff: strip the common prefix+suffix shared by all siblings
  const labels = nameDifferences(all.map((x) => x.name));
  const idx = all.findIndex((x) => x.slug === p.slug);
  if (idx >= 0 && labels[idx] && labels[idx].trim()) return labels[idx].trim();

  // 4. Fallback: the product name itself (clean, never broken)
  return p.name;
}

/**
 * Given a list of names, compute the differentiating part of each by
 * stripping the longest common prefix and suffix.
 */
function nameDifferences(names: string[]): string[] {
  if (names.length < 2) return names;
  const sorted = [...names];
  let prefix = sorted[0];
  for (const n of sorted.slice(1)) {
    while (prefix && !n.toLowerCase().startsWith(prefix.toLowerCase())) {
      prefix = prefix.slice(0, -1);
    }
  }
  let suffix = sorted[0];
  for (const n of sorted.slice(1)) {
    while (suffix && !n.toLowerCase().endsWith(suffix.toLowerCase())) {
      suffix = suffix.slice(1);
    }
  }
  return sorted.map((n) => {
    let s = n;
    if (prefix && s.toLowerCase().startsWith(prefix.toLowerCase())) {
      s = s.slice(prefix.length);
    }
    if (suffix && suffix.length < n.length && s.toLowerCase().endsWith(suffix.toLowerCase())) {
      s = s.slice(0, s.length - suffix.length);
    }
    return s.trim() || n; // if stripping consumed everything, keep the full name
  });
}

/**
 * Build the customer-safe variant options for a product.
 * Returns [] when the product has no class or is the only member.
 * NEVER includes the classCode — only sibling slugs and labels.
 */
export function variantOptionsFor(current: VariantInput, all: VariantInput[]): VariantOption[] {
  if (!current.classCode) return [];
  const siblings = all.filter(
    (p) => p.classCode === current.classCode && p.slug !== current.slug
  );
  if (siblings.length === 0) return [];
  const family = [current, ...siblings];
  return family
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({
      id: p.slug,
      label: deriveLabel(p, family),
      isCurrent: p.slug === current.slug,
    }));
}
