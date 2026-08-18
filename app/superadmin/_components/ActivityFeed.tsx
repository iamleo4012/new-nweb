"use client";

import { useEffect, useState } from "react";
import { apiGet, fmtDate } from "./shared";

interface ActivityEntry {
  id: number;
  action: string;
  entity: string;
  entityId: string;
  detail: string;
  createdAt: string;
  actor: { id: number; name: string; email: string; role: string } | null;
}

const ACTION_COLORS: Record<string, string> = {
  EMPLOYEE_CREATE: "bg-emerald-100 text-emerald-800",
  EMPLOYEE_REACTIVATE: "bg-emerald-100 text-emerald-800",
  EMPLOYEE_UPDATE: "bg-blue-100 text-blue-800",
  EMPLOYEE_ROLE_CHANGE: "bg-violet-100 text-violet-800",
  EMPLOYEE_DEACTIVATE: "bg-red-100 text-red-800",
  EMPLOYEE_PASSWORD_RESET: "bg-amber-100 text-amber-800",
  PRODUCT_STOCK_CHANGE: "bg-amber-100 text-amber-800",
  ORDER_STATUS_CHANGE: "bg-blue-100 text-blue-800",
  ORDER_FULFILLMENT: "bg-cyan-100 text-cyan-800",
};

/**
 * Owner activity feed — recent business events from the EXISTING AuditLog
 * (who / what / when / target / old→new details).
 */
export default function ActivityFeed({ limit = 20 }: { limit?: number }) {
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    apiGet<{ activity: ActivityEntry[] }>(`/api/superadmin/activity?limit=${limit}`).then((res) => {
      if (!alive) return;
      if (res.success && res.data) setEntries(res.data.activity);
      else setError(res.error || "Failed to load activity");
    });
    return () => { alive = false; };
  }, [limit]);

  if (error) return <p className="text-red-600 text-sm bg-white rounded-xl border border-gray-100 p-4">{error}</p>;
  if (!entries) return <p className="text-gray-400 text-sm p-4">Loading activity…</p>;
  if (entries.length === 0) return <p className="text-gray-400 text-sm p-4 text-center">No recorded activity yet.</p>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700">Recent Activity</h2>
        <a href="/admin" className="text-xs font-semibold text-amber-700 hover:text-amber-800">
          Full audit log →
        </a>
      </div>
      <ul className="space-y-3">
        {entries.map((e) => (
          <li key={e.id} className="flex gap-3 items-start">
            <span className={`mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${ACTION_COLORS[e.action] ?? "bg-gray-100 text-gray-700"}`}>
              {e.action}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-800">
                <span className="font-semibold">{e.actor ? e.actor.name : "System"}</span>
                <span className="text-gray-400"> · {e.entity}{e.entityId ? ` #${e.entityId}` : ""}</span>
              </p>
              {e.detail && <p className="text-xs text-gray-500 break-words mt-0.5">{e.detail}</p>}
              <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(e.createdAt)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
