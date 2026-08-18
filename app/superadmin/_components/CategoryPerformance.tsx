"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { apiGet, fmtKD, rangeQuery, type RangeSelection } from "./shared";

type Level = "department" | "category" | "subcategory";

interface CategoryData {
  range: { key: string; label: string };
  level: Level;
  rows: Array<{ slug: string; name: string; revenue: number; orders: number }>;
  currency: string;
}

const LEVELS: Array<{ key: Level; label: string }> = [
  { key: "department", label: "Department" },
  { key: "category", label: "Category" },
  { key: "subcategory", label: "Subcategory" },
];

export default function CategoryPerformance({ range }: { range: RangeSelection }) {
  const [level, setLevel] = useState<Level>("department");
  const [data, setData] = useState<CategoryData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setData(null);
    setError("");
    apiGet<CategoryData>(`/api/superadmin/category-performance?${rangeQuery(range)}&level=${level}`).then((res) => {
      if (!alive) return;
      if (res.success && res.data) setData(res.data);
      else setError(res.error || "Failed to load categories");
    });
    return () => { alive = false; };
  }, [range, level]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700">Category Performance</h2>
          <p className="text-xs text-gray-400 mt-0.5">{data?.range.label ?? ""} · revenue by {level}</p>
        </div>
        <div className="flex gap-1.5">
          {LEVELS.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setLevel(l.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                level === l.key ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {!error && !data && <p className="text-gray-400 text-sm py-4">Loading…</p>}
      {data && data.rows.length === 0 && (
        <p className="text-gray-400 text-sm py-4 text-center">No sales recorded in this period.</p>
      )}

      {data && data.rows.length > 0 && (
        <>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.rows.slice(0, 12)} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={55}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                  tickFormatter={(v: number) => `${v.toFixed(0)} KD`}
                />
                <Tooltip
                  formatter={(v) => [fmtKD(Number(v)), "Revenue"] as [string, string]}
                  labelFormatter={(l) => String(l)}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="#825335" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-100">
                  <th className="py-2 pr-3">{level === "department" ? "Department" : level === "category" ? "Category" : "Subcategory"}</th>
                  <th className="py-2 pr-3 text-right">Revenue</th>
                  <th className="py-2 text-right">Orders</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.slug} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-3 font-medium text-gray-800">{r.name}</td>
                    <td className="py-2 pr-3 text-right font-semibold">{fmtKD(r.revenue)}</td>
                    <td className="py-2 text-right text-gray-600">{r.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
