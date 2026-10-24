"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { REPORT_COLUMNS, resolveReportColumnKeys, type ReportColumn } from "@/lib/report-columns";

/**
 * Screen + print renderer for the admin Product Report.
 *
 * Configuration arrives via query string (built by ReportDialog); the
 * complete matching dataset is fetched from /api/admin/products/report
 * (requireAdmin-gated, unpaginated — one request returns every matching
 * product). The PDF itself is produced by the browser's native Print dialog.
 */

interface ReportProduct {
  id: number;
  slug: string;
  name: string;
  nameAr: string;
  description: string;
  longDescription: string;
  price: number;
  costPrice: number;
  currency: string;
  image: string;
  images: string[];
  line: string;
  sku: string;
  barcode: string;
  ndNumber: string;
  internalCode: string;
  classCode: string;
  specs: unknown;
  applications: string;
  additionalInfo: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  dimensionUnit: string;
  warranty: string;
  stock: number;
  minStock: number;
  stockStatus: string;
  isActive: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  createdAt: string;
  updatedAt: string;
  department: string;
  category: string;
  subcategory: string;
  brand: string;
  material: string;
  supplier: string;
  unit: string;
  country: string;
  tax: string;
}

const EMPTY = "—";

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
// Latin brand names / product codes (e.g. Al-nassim-ND-6724): letter-led runs of
// letters, digits and .-_ connectors. Captured so String.split alternates
// [non-run, run, non-run, …].
const LATIN_RUN_RE = /([A-Za-z][A-Za-z0-9]*(?:[.\-_][A-Za-z0-9]+)*)/g;

/**
 * Render mixed Arabic/Latin cell text without changing the string.
 *
 * The admin form edits the Arabic name in a dir="rtl" input, so the report must
 * use the same RTL base direction — otherwise the bidi algorithm resolves
 * neutrals (spaces, hyphens) against LTR and the visual order differs from what
 * the admin sees. Each Latin run is wrapped in <bdi dir="ltr"> so codes like
 * "Al-nassim-ND-6724" keep their internal order regardless of surrounding
 * context. The text itself is never reversed, split into storage, or rewritten.
 */
function renderBidiCell(text: string) {
  if (!ARABIC_RE.test(text)) return text;
  return text.split(LATIN_RUN_RE).map((seg, i) =>
    i % 2 === 1 ? (
      <bdi key={i} dir="ltr">{seg}</bdi>
    ) : (
      seg ? <Fragment key={i}>{seg}</Fragment> : null
    ),
  );
}

function cellDirection(col: ReportColumn, text: string): "rtl" | "auto" {
  // Arabic Name column mirrors the admin form's dir="rtl" input; any other
  // cell that merely contains Arabic auto-detects its base direction.
  return col.key === "nameAr" || ARABIC_RE.test(text) ? "rtl" : "auto";
}

function formatValue(p: ReportProduct, col: ReportColumn): { text: string; kind: "text" | "image" } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (p as any)[col.key];
  const isBlank =
    raw === null ||
    raw === undefined ||
    (typeof raw === "string" && raw.trim() === "") ||
    (Array.isArray(raw) && raw.length === 0);
  if (isBlank) return { text: EMPTY, kind: "text" };

  switch (col.type) {
    case "boolean":
      return { text: raw ? "Yes" : "No", kind: "text" };
    case "currency":
      // Fixed three decimals, e.g. 0.750 KD / 1.000 KD.
      return { text: `${Number(raw).toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${p.currency || ""}`.trim(), kind: "text" };
    case "date":
      return { text: new Date(raw).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }), kind: "text" };
    case "number": {
      const n = Number(raw);
      const unit = ["length", "width", "height", "depth", "weight"].includes(col.key) && p.dimensionUnit ? ` ${p.dimensionUnit}` : "";
      return { text: `${n.toLocaleString("en-US", { maximumFractionDigits: 3 })}${unit}`, kind: "text" };
    }
    case "array":
      return { text: raw.map((v: unknown) => (typeof v === "object" && v !== null && "name" in (v as object) ? String((v as { name: unknown }).name) : String(v))).join(", "), kind: "text" };
    case "specs": {
      // Stored shape: [{"label":"…","value":"…","note":"…"}] (see SpecsEditor).
      let rows: { label?: unknown; value?: unknown }[] = [];
      try {
        const parsed = typeof raw === "string" ? JSON.parse(raw || "[]") : raw;
        if (Array.isArray(parsed)) rows = parsed;
      } catch { /* unparseable — fall through to empty */ }
      if (!rows.length) return { text: EMPTY, kind: "text" };
      return {
        text: rows.map((r) => `${r.label ?? ""}: ${r.value ?? ""}`.replace(/^:\s*/, "")).join("; "),
        kind: "text",
      };
    }
    default:
      return { text: String(raw), kind: "text" };
  }
}

export default function PrintReportClient() {
  const sp = useSearchParams();
  const [products, setProducts] = useState<ReportProduct[] | null>(null);
  const [modifiedFields, setModifiedFields] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");

  // Validated configuration — invalid values fall back to safe defaults.
  const orientation = sp.get("orientation") === "portrait" ? "portrait" : "landscape";
  const imageSize = (["small", "medium", "large", "xlarge"] as const).includes(sp.get("imageSize") as never)
    ? (sp.get("imageSize") as "small" | "medium" | "large" | "xlarge")
    : "medium";
  const visibility = sp.get("visibility") === "displayed" ? "displayed" : "all";
  const colsMode = sp.get("colsMode") === "select" ? "select" : "all";
  const selectedCols: ReportColumn[] = useMemo(() => {
    if (colsMode !== "select") return REPORT_COLUMNS;
    const keys = resolveReportColumnKeys((sp.get("cols") || "").split(",").filter(Boolean));
    return keys.map((k) => REPORT_COLUMNS.find((c) => c.key === k)!).filter(Boolean);
  }, [colsMode, sp]);

  const filters = useMemo(() => {
    const q = (sp.get("q") || "").trim();
    const categoryId = Number(sp.get("categoryId")) || 0;
    const idFrom = Number(sp.get("idFrom")) || 0;
    const idTo = Number(sp.get("idTo")) || 0;
    return { q, categoryId, idFrom, idTo };
  }, [sp]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    params.set("visibility", visibility);
    if (filters.q) params.set("q", filters.q);
    if (filters.categoryId) params.set("categoryId", String(filters.categoryId));
    if (filters.idFrom) params.set("idFrom", String(filters.idFrom));
    if (filters.idTo) params.set("idTo", String(filters.idTo));
    fetch(`/api/admin/products/report?${params.toString()}`, { credentials: "same-origin" })
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok || !d?.success) throw new Error(d?.error || `Request failed (${r.status})`);
        return d;
      })
      .then((d) => {
        if (cancelled) return;
        setProducts(d.data.products);
        setModifiedFields(d.data.modifiedFields ?? {});
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message || "Could not load the report.");
      });
    return () => { cancelled = true; };
  }, [visibility, filters]);

  const now = useMemo(() => new Date(), []); // generated timestamp, fixed at load
  const total = products?.length ?? 0;
  const fieldCount = colsMode === "select" ? selectedCols.length : REPORT_COLUMNS.length;

  return (
    <div className={`print-report${orientation === "portrait" ? " rp-portrait" : ""} rp-img-${imageSize}`}>
      {/* ---- Screen-only toolbar (hidden when printing) ---- */}
      <div className="rp-toolbar">
        <button type="button" onClick={() => window.close()} className="rp-btn">Close</button>
        <span className="rp-title">Product Report — Al Nassim Golden Group</span>
        <button type="button" onClick={() => window.print()} className="rp-btn rp-btn-primary">Print / Save as PDF</button>
      </div>

      {error && (
        <div className="rp-state">
          <p className="rp-state-title">Could not load the report</p>
          <p>{error}</p>
          <p className="rp-state-hint">Make sure you are signed in to the admin area, then reopen the report from the products page.</p>
          <button type="button" onClick={() => window.close()} className="rp-btn">Close</button>
        </div>
      )}

      {!error && products === null && (
        <div className="rp-state">
          <p className="rp-state-title">Loading products…</p>
          <p>Fetching the matching products from the database…</p>
        </div>
      )}

      {!error && products !== null && total === 0 && (
        <div className="rp-state">
          <p className="rp-state-title">No products match this report</p>
          <p>No products match the selected visibility option and filters. Go back and adjust the report settings.</p>
          <button type="button" onClick={() => window.close()} className="rp-btn">Close</button>
        </div>
      )}

      {!error && products !== null && total > 0 && (
        <>
          {/* ---- Report header ---- */}
          <div className="rp-header">
            <h1 className="rp-h1">Product Report</h1>
            <div className="rp-meta">
              <span><strong>Products:</strong> {total.toLocaleString("en-US")}</span>
              <span><strong>Data fields:</strong> {fieldCount}</span>
              <span><strong>Products included:</strong> {visibility === "all" ? "All products (displayed + hidden)" : "Displayed products only"}</span>
              <span><strong>Orientation:</strong> {orientation === "landscape" ? "Landscape (A4)" : "Portrait (A4)"}</span>
              <span><strong>Image size:</strong> {{ small: "Small", medium: "Medium", large: "Large", xlarge: "Extra Large" }[imageSize]}</span>
              <span><strong>Generated:</strong> {now.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
              {Boolean(filters.q || filters.categoryId || filters.idFrom || filters.idTo) && (
                <span>
                  <strong>Filters:</strong>{" "}
                  {[
                    filters.q ? `Search: "${filters.q}"` : "",
                    filters.categoryId ? `Category ID: ${filters.categoryId}` : "",
                    filters.idFrom ? `ID from: ${filters.idFrom}` : "",
                    filters.idTo ? `ID to: ${filters.idTo}` : "",
                  ].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
          </div>

          {/* ---- Product table: image column always first ---- */}
          <table className="rp-table">
            <thead>
              <tr>
                <th className="rp-th rp-th-img">Image</th>
                {selectedCols.map((c) => <th key={c.key} className="rp-th">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const mods = new Set(modifiedFields[String(p.id)] ?? []);
                return (
                  <tr key={p.id} className="rp-tr">
                    <td className="rp-td rp-td-img">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt={p.name} className="rp-img" />
                      ) : (
                        <span className="rp-noimg">{EMPTY}</span>
                      )}
                    </td>
                    {selectedCols.map((c) => {
                      const { text } = formatValue(p, c);
                      const red = c.key !== "isActive" && mods.has(c.key);
                      return (
                        <td
                          key={c.key}
                          dir={cellDirection(c, text)}
                          className={`rp-td${red ? " rp-modified" : ""}`}
                        >{renderBidiCell(text)}</td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {/* ---- Print-report CSS (screen preview + @page print rules) ---- */}
      <style>{`
/* ============ PRINT REPORT (admin/print-report) ============ */
.print-report {
  --rp-border: #cbd5d1;
  padding: 16px;
  font-family: Arial, Helvetica, sans-serif;
  color: #000;
  background: #fff;
  color-scheme: light;
}
/* Screen-only toolbar */
.print-report .rp-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #1f2937;
  border-radius: 10px;
  margin-bottom: 14px;
  position: sticky;
  top: 8px;
  z-index: 10;
}
.print-report .rp-title { color: #fff; font-weight: 600; font-size: 14px; flex: 1; }
.print-report .rp-btn {
  border: 1px solid #d1d5db;
  background: #fff;
  color: #1f2937;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.print-report .rp-btn-primary { background: #2563eb; border-color: #2563eb; color: #fff; }
.print-report .rp-btn:hover { filter: brightness(0.96); }

/* Loading / error / empty states */
.print-report .rp-state {
  max-width: 520px;
  margin: 60px auto;
  border: 1px solid var(--rp-border);
  border-radius: 12px;
  padding: 24px;
  font-size: 14px;
  line-height: 1.6;
}
.print-report .rp-state-title { font-weight: 700; font-size: 16px; margin: 0 0 8px; }
.print-report .rp-state .rp-btn { margin-top: 14px; }
.print-report .rp-state-hint { color: #6b7280; font-size: 12px; }

/* Report header */
.print-report .rp-header { margin-bottom: 10px; }
.print-report .rp-h1 { font-size: 18px; margin: 0 0 6px; }
.print-report .rp-meta { display: flex; flex-wrap: wrap; gap: 4px 18px; font-size: 11px; color: #000; }

/* Product table */
.print-report .rp-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
  font-size: 10px;
}
.print-report .rp-th, .print-report .rp-td {
  border: 1px solid var(--rp-border);
  padding: 3px 5px;
  text-align: left;
  vertical-align: top;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.print-report .rp-th {
  background: #eef2ef;
  font-weight: 700;
  white-space: nowrap;
}
.print-report .rp-th-img { width: 60px; }
.print-report .rp-tr:nth-child(even) .rp-td { background: #f6f8f6; }
.print-report .rp-td-img {
  text-align: center;
  vertical-align: middle;
  background: #fff;
}
/* Image sizes: fixed square box, object-fit:contain keeps the whole product
   visible without cropping or distortion; the cell grows with the box. */
.print-report .rp-img {
  object-fit: contain;
  display: inline-block;
  max-width: 100%;
}
.print-report.rp-img-small  .rp-img { width: 44px;  height: 44px; }
.print-report.rp-img-medium .rp-img { width: 72px;  height: 72px; }
.print-report.rp-img-large  .rp-img { width: 104px; height: 104px; }
.print-report.rp-img-xlarge .rp-img { width: 140px; height: 140px; }
.print-report.rp-img-small  .rp-th-img, .print-report.rp-img-small  .rp-td-img { width: 56px; }
.print-report.rp-img-medium .rp-th-img, .print-report.rp-img-medium .rp-td-img { width: 88px; }
.print-report.rp-img-large  .rp-th-img, .print-report.rp-img-large  .rp-td-img { width: 124px; }
.print-report.rp-img-xlarge .rp-th-img, .print-report.rp-img-xlarge .rp-td-img { width: 164px; }
.print-report .rp-noimg { color: #000; }
/* Modified fields stay black — flagged by weight only, never underlined. */
.print-report .rp-modified { color: #000; font-weight: 700; }
/* Clean, link-free report typography: no underlines anywhere. */
.print-report a, .print-report a * { text-decoration: none !important; }
.print-report .rp-td, .print-report .rp-th, .print-report .rp-td *, .print-report .rp-th * { text-decoration: none; }

/* Portrait uses tighter image sizing (proportionally scaled down) */
.print-report.rp-portrait .rp-table { font-size: 9px; }
.print-report.rp-portrait .rp-th, .print-report.rp-portrait .rp-td { padding: 2px 4px; }
.print-report.rp-portrait.rp-img-small  .rp-img { width: 36px;  height: 36px; }
.print-report.rp-portrait.rp-img-medium .rp-img { width: 60px;  height: 60px; }
.print-report.rp-portrait.rp-img-large  .rp-img { width: 88px;  height: 88px; }
.print-report.rp-portrait.rp-img-xlarge .rp-img { width: 116px; height: 116px; }
.print-report.rp-portrait.rp-img-small  .rp-th-img, .print-report.rp-portrait.rp-img-small  .rp-td-img { width: 48px; }
.print-report.rp-portrait.rp-img-medium .rp-th-img, .print-report.rp-portrait.rp-img-medium .rp-td-img { width: 74px; }
.print-report.rp-portrait.rp-img-large  .rp-th-img, .print-report.rp-portrait.rp-img-large  .rp-td-img { width: 104px; }
.print-report.rp-portrait.rp-img-xlarge .rp-th-img, .print-report.rp-portrait.rp-img-xlarge .rp-td-img { width: 136px; }

/* ---- Native printing (browser Print dialog → Save as PDF) ---- */
@media print {
  @page { size: A4 ${orientation}; margin: 10mm; }
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; color: #000 !important; color-scheme: light; }
  body * { visibility: visible; }
  .print-report { padding: 0; background: #fff !important; }
  /* Non-report chrome (screen toolbar, states) must never print */
  .print-report .rp-toolbar,
  .print-report .rp-state { display: none !important; }
  .print-report .rp-table { font-size: 9pt; }
  .print-report.rp-portrait .rp-table { font-size: 8pt; }
  .print-report .rp-th, .print-report .rp-td { padding: 2px 4px; }
  /* All printed text must be solid black — override any colored text styles.
     Applies to names (Arabic + English), SKUs, prices, headers, metadata,
     filters and modified-field indicators. Borders and zebra backgrounds keep
     their colors via print-color-adjust below. */
  .print-report, .print-report * { color: #000 !important; }
  /* No underlines or link styling in the printed PDF */
  .print-report, .print-report * { text-decoration: none !important; }
  /* Keep zebra stripes and table borders in the printed PDF */
  .print-report .rp-th,
  .print-report .rp-tr:nth-child(even) .rp-td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-report .rp-th, .print-report .rp-td { border-color: #9ca3af !important; }
  /* Table uses the full printable width without clipped columns */
  .print-report .rp-table { width: 100% !important; table-layout: auto; }
  /* Repeat headers on every printed page; never split a row */
  .print-report .rp-thead, .print-report .rp-table thead { display: table-header-group; }
  .print-report .rp-tr { page-break-inside: avoid; break-inside: avoid; }
  .print-report .rp-header { page-break-after: avoid; break-after: avoid; }
}
`}</style>
    </div>
  );
}
