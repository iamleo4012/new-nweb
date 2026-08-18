"use client";

import { STATUS_LABELS } from "./shared";

/**
 * Order analytics for the SELECTED range (fed by the same /sales response as
 * the chart, so numbers can never disagree). "Returned" is explicitly marked
 * unavailable — the data model has no RETURNED status and we never invent it.
 */
export default function OrderAnalytics({
  byStatus,
  ordersInRange,
  rangeLabel,
}: {
  byStatus: Record<string, number>;
  ordersInRange: number;
  rangeLabel: string;
}) {
  const entries = Object.entries(byStatus).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700">Order Analytics</h2>
        <p className="text-xs text-gray-400">{ordersInRange} order(s) · {rangeLabel}</p>
      </div>

      {entries.length === 0 ? (
        <p className="text-gray-400 text-sm py-4 text-center">No orders in this period.</p>
      ) : (
        <div className="space-y-2.5">
          {entries.map(([status, count]) => (
            <div key={status} className="flex items-center gap-3">
              <span className="w-44 shrink-0 text-xs font-medium text-gray-600 truncate">
                {STATUS_LABELS[status] ?? status}
              </span>
              <div className="flex-1 h-5 bg-gray-100 rounded-md overflow-hidden">
                <div
                  className={`h-full rounded-md ${status.startsWith("CANCELLED") ? "bg-red-400" : status === "COMPLETED" || status === "DELIVERED" ? "bg-emerald-500" : "bg-amber-400"}`}
                  style={{ width: `${Math.round((count / max) * 100)}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs font-bold text-gray-700">{count}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
        <span className="inline-block w-2 h-2 rounded-full bg-gray-300" />
        Returned — not supported by current data (no RETURNED status exists in the order workflow).
      </div>
    </div>
  );
}
