"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { apiGet, fmtKD, type RangeSelection, rangeQuery } from "./shared";
import OrderAnalytics from "./OrderAnalytics";

type Metric = "revenue" | "orders" | "aov";

interface SalesData {
  range: { key: string; label: string; bucket: string };
  summary: { revenue: number; orders: number; aov: number | null };
  series: Array<{ bucketStart: string; revenue: number; orders: number; aov: number | null }>;
  ordersInRange: number;
  ordersByStatus: Record<string, number>;
  currency: string;
}

function bucketLabel(iso: string, bucket: string): string {
  const d = new Date(iso);
  return bucket === "month"
    ? d.toLocaleString(undefined, { month: "short", year: "2-digit" })
    : d.toLocaleString(undefined, { day: "2-digit", month: "short" });
}

export default function SalesChart({ range }: { range: RangeSelection }) {
  const [data, setData] = useState<SalesData | null>(null);
  const [error, setError] = useState("");
  const [metric, setMetric] = useState<Metric>("revenue");

  useEffect(() => {
    let alive = true;
    setData(null);
    setError("");
    apiGet<SalesData>(`/api/superadmin/sales?${rangeQuery(range)}`).then((res) => {
      if (!alive) return;
      if (res.success && res.data) setData(res.data);
      else setError(res.error || "Failed to load sales");
    });
    return () => { alive = false; };
  }, [range]);

  if (error) return <p className="text-red-600 text-sm bg-white rounded-xl border border-gray-100 p-4">{error}</p>;
  if (!data) return <p className="text-gray-400 text-sm p-4">Loading sales…</p>;

  const chartRows = data.series.map((p) => ({
    label: bucketLabel(p.bucketStart, data.range.bucket),
    revenue: p.revenue,
    orders: p.orders,
    aov: p.aov ?? 0,
  }));

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700">Sales Over Time</h2>
            <p className="text-xs text-gray-400 mt-0.5">{data.range.label} · {data.series.length} {data.range.bucket}(s)</p>
          </div>
          <div className="flex gap-1.5">
            {(["revenue", "orders", "aov"] as Metric[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  metric === m ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {m === "revenue" ? "Revenue" : m === "orders" ? "Orders" : "Avg Order Value"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Revenue</p>
            <p className="text-lg font-bold text-slate-900">{fmtKD(data.summary.revenue)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Orders</p>
            <p className="text-lg font-bold text-slate-900">{data.summary.orders}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Avg Order Value</p>
            <p className="text-lg font-bold text-slate-900">{data.summary.aov === null ? "—" : fmtKD(data.summary.aov)}</p>
          </div>
        </div>

        {chartRows.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">No billable orders in this period.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartRows} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="metricFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#825335" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#825335" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                  tickFormatter={(v: number) => (metric === "revenue" || metric === "aov" ? `${v.toFixed(0)} KD` : String(v))}
                />
                <Tooltip
                  formatter={(v) =>
                    metric === "orders" ? [String(v), "Orders"] : [fmtKD(Number(v)), metric === "revenue" ? "Revenue" : "AOV"] as [string, string]
                  }
                  contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <Area type="monotone" dataKey={metric} stroke="#825335" strokeWidth={2} fill="url(#metricFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <OrderAnalytics byStatus={data.ordersByStatus} ordersInRange={data.ordersInRange} rangeLabel={data.range.label} />
    </section>
  );
}
