"use client";

/**
 * Shared client-side helpers for the owner dashboard. Mirrors the admin
 * SPA's conventions: {success,data,error} envelope, credentials same-origin,
 * KWD with 3 decimals, client-side CSV export.
 */

export interface Envelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export async function apiGet<T>(url: string): Promise<Envelope<T>> {
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    return (await res.json()) as Envelope<T>;
  } catch {
    return { success: false, data: null, error: "Network error" };
  }
}

export async function apiSend<T>(url: string, method: "POST" | "PATCH", body: unknown): Promise<Envelope<T>> {
  try {
    const res = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as Envelope<T>;
  } catch {
    return { success: false, data: null, error: "Network error" };
  }
}

/** KWD is always rendered with 3 decimals (project currency convention). */
export function fmtKD(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(3)} KD`;
}

export function fmtDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString(undefined, {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ------------------------- date-range filter ------------------------- */

export type RangeKey = "today" | "7d" | "30d" | "this_month" | "custom";

export interface RangeSelection {
  key: RangeKey;
  from: string; // yyyy-mm-dd (custom only)
  to: string;   // yyyy-mm-dd (custom only)
}

export const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "this_month", label: "This Month" },
  { key: "custom", label: "Custom" },
];

/** Build the query string every range-driven section uses (ONE range everywhere). */
export function rangeQuery(r: RangeSelection): string {
  const p = new URLSearchParams({ range: r.key });
  if (r.key === "custom") {
    p.set("from", r.from);
    p.set("to", r.to);
  }
  return p.toString();
}

/* ------------------------- order statuses ------------------------- */

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  UNDER_REVIEW: "Under Review",
  READY_FOR_CONFIRMATION: "Awaiting Confirmation",
  CONFIRMED: "Confirmed",
  PACKING: "Packing",
  READY_FOR_DELIVERY: "Ready for Delivery",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED_BY_CUSTOMER: "Cancelled (Customer)",
  CANCELLED_BY_STAFF: "Cancelled (Staff)",
};

export const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  UNDER_REVIEW: "bg-amber-100 text-amber-800",
  READY_FOR_CONFIRMATION: "bg-orange-100 text-orange-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PACKING: "bg-indigo-100 text-indigo-800",
  READY_FOR_DELIVERY: "bg-violet-100 text-violet-800",
  OUT_FOR_DELIVERY: "bg-cyan-100 text-cyan-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED_BY_CUSTOMER: "bg-red-100 text-red-800",
  CANCELLED_BY_STAFF: "bg-red-100 text-red-800",
};

/* ------------------------- CSV export ------------------------- */

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Client-side CSV download — same approach as the existing admin AuditLogTab. */
export function downloadCsv(filename: string, headers: string[], rows: Array<Array<unknown>>) {
  const lines = [headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
