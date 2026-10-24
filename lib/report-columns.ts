/**
 * Central column definitions for the admin Product Report (Print / Export PDF).
 *
 * Every entry maps 1:1 to a real Product column or an existing relation that
 * the admin products API already serializes (see app/api/admin/products/route.ts
 * — serializeBase / listSerialize). No invented fields, no schema changes.
 *
 * `key` values must match the keys the report API returns for each product
 * (see app/api/admin/products/report/route.ts).
 */

export type ReportFieldType =
  | "text"
  | "longtext"
  | "number"
  | "currency"
  | "boolean"
  | "date"
  | "array"
  | "specs"
  | "relation";

export interface ReportColumn {
  /** Stable key used in the print-report query string and product payload. */
  key: string;
  /** Human-readable column header. */
  label: string;
  type: ReportFieldType;
  /** Logical group shown in the column picker. */
  group: string;
}

export const REPORT_COLUMN_GROUPS = [
  "Product Identity",
  "Classification",
  "Product Information",
  "Attributes",
  "Logistics",
  "Commercial",
  "SEO",
  "Status & Audit",
  "Media",
] as const;

export const REPORT_COLUMNS: ReportColumn[] = [
  // ---- Product Identity -------------------------------------------------
  { key: "id", label: "Product ID", type: "number", group: "Product Identity" },
  { key: "slug", label: "Slug", type: "text", group: "Product Identity" },
  { key: "name", label: "Name (EN)", type: "text", group: "Product Identity" },
  { key: "nameAr", label: "Name (AR)", type: "text", group: "Product Identity" },
  { key: "sku", label: "SKU", type: "text", group: "Product Identity" },
  { key: "barcode", label: "Barcode", type: "text", group: "Product Identity" },
  { key: "internalCode", label: "Internal Code", type: "text", group: "Product Identity" },
  { key: "ndNumber", label: "ND Number", type: "text", group: "Product Identity" },
  { key: "classCode", label: "Product Class", type: "text", group: "Product Identity" },

  // ---- Classification ----------------------------------------------------
  { key: "department", label: "Department", type: "relation", group: "Classification" },
  { key: "category", label: "Category", type: "relation", group: "Classification" },
  { key: "subcategory", label: "Subcategory", type: "relation", group: "Classification" },
  { key: "brand", label: "Brand", type: "relation", group: "Classification" },
  { key: "line", label: "Line", type: "text", group: "Classification" },
  { key: "tags", label: "Tags", type: "array", group: "Classification" },

  // ---- Product Information ------------------------------------------------
  { key: "description", label: "Short Description", type: "longtext", group: "Product Information" },
  { key: "longDescription", label: "Long Description", type: "longtext", group: "Product Information" },
  { key: "applications", label: "Applications", type: "longtext", group: "Product Information" },
  { key: "additionalInfo", label: "Additional Information", type: "longtext", group: "Product Information" },
  { key: "specs", label: "Specifications", type: "specs", group: "Product Information" },
  { key: "warranty", label: "Warranty", type: "text", group: "Product Information" },

  // ---- Attributes ----------------------------------------------------------
  { key: "colors", label: "Colors", type: "array", group: "Attributes" },
  { key: "sizes", label: "Sizes", type: "array", group: "Attributes" },
  { key: "isFeatured", label: "Featured", type: "boolean", group: "Attributes" },
  { key: "isNewArrival", label: "New Arrival", type: "boolean", group: "Attributes" },
  { key: "isBestSeller", label: "Best Seller", type: "boolean", group: "Attributes" },

  // ---- Logistics -------------------------------------------------------------
  { key: "stock", label: "Stock", type: "number", group: "Logistics" },
  { key: "minStock", label: "Min Stock", type: "number", group: "Logistics" },
  { key: "stockStatus", label: "Stock Status", type: "text", group: "Logistics" },
  { key: "weight", label: "Weight", type: "number", group: "Logistics" },
  { key: "length", label: "Length", type: "number", group: "Logistics" },
  { key: "width", label: "Width", type: "number", group: "Logistics" },
  { key: "height", label: "Height", type: "number", group: "Logistics" },
  { key: "depth", label: "Depth", type: "number", group: "Logistics" },
  { key: "dimensionUnit", label: "Dimension Unit", type: "text", group: "Logistics" },
  { key: "unit", label: "Unit", type: "relation", group: "Logistics" },
  { key: "supplier", label: "Supplier", type: "relation", group: "Logistics" },
  { key: "country", label: "Country", type: "relation", group: "Logistics" },
  { key: "material", label: "Material", type: "relation", group: "Logistics" },

  // ---- Commercial ---------------------------------------------------------
  { key: "price", label: "Price", type: "currency", group: "Commercial" },
  { key: "costPrice", label: "Cost Price", type: "currency", group: "Commercial" },
  { key: "currency", label: "Currency", type: "text", group: "Commercial" },
  { key: "tax", label: "Tax", type: "relation", group: "Commercial" },

  // ---- SEO -------------------------------------------------------------------
  { key: "seoTitle", label: "SEO Title", type: "text", group: "SEO" },
  { key: "seoDescription", label: "SEO Description", type: "longtext", group: "SEO" },

  // ---- Status & Audit ---------------------------------------------------------
  { key: "isActive", label: "Displayed on Website", type: "boolean", group: "Status & Audit" },
  { key: "createdAt", label: "Created At", type: "date", group: "Status & Audit" },
  { key: "updatedAt", label: "Last Updated", type: "date", group: "Status & Audit" },

  // ---- Media ---------------------------------------------------------------
  { key: "images", label: "Additional Images", type: "array", group: "Media" },
];

/** Columns grouped for the picker, preserving definition order. */
export const REPORT_COLUMNS_BY_GROUP: { group: string; columns: ReportColumn[] }[] =
  REPORT_COLUMN_GROUPS.map((group) => ({
    group,
    columns: REPORT_COLUMNS.filter((c) => c.group === group),
  })).filter((g) => g.columns.length > 0);

export const ALL_REPORT_COLUMN_KEYS = REPORT_COLUMNS.map((c) => c.key);

/** Drops unknown keys; returns all keys when the selection is empty/invalid. */
export function resolveReportColumnKeys(raw: string[] | null | undefined): string[] {
  const valid = (raw ?? []).filter((k) => ALL_REPORT_COLUMN_KEYS.includes(k));
  return valid.length ? valid : ALL_REPORT_COLUMN_KEYS;
}
