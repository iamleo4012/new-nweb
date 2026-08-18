"use client";

import { useEffect, useState } from "react";
import { apiGet, downloadCsv, fmtKD, rangeQuery, type RangeSelection } from "./shared";

type Sort = "units" | "revenue" | "lowest";

interface TopProductsData {
  range: { key: string; label: string };
  sort: Sort;
  products: Array<{ slug: string; name: string; image: string; units: number; revenue: number; orders: number }>;
  currency: string;
}

export default function TopProducts({ range }: { range: RangeSelection }) {
  const [data, setData] = useState<TopProductsData | null>(null);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<Sort>("units");

  useEffect(() => {
    let alive = true;
    setData(null);
    setError("");
    apiGet<TopProductsData>(`/api/superadmin/top-products?${rangeQuery(range)}&sort=${sort}`).then((res) => {
      if (!alive) return;
      if (res.success && res.data) setData(res.data);
      else setError(res.error || "Failed to load products");
    });
    return () => { alive = false; };
  }, [range, sort]);

  function exportCsv() {
    if (!data) return;
    downloadCsv(
      `top-products-${data.range.key}.csv`,
      ["Product", "Units Sold", "Revenue (KD)", "Orders"],
      data.products.map((p) => [p.name, p.units, p.revenue.toFixed(3), p.orders])
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700">Top Products</h2>
          <p className="text-xs text-gray-400 mt-0.5">{data?.range.label ?? ""}</p>
        </div>
        <div className="flex gap-1.5">
          {(["units", "revenue", "lowest"] as Sort[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                sort === s ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "units" ? "Most Sold" : s === "revenue" ? "Highest Revenue" : "Lowest Sales"}
            </button>
          ))}
          <button
            type="button"
            onClick={exportCsv}
            disabled={!data?.products.length}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {!error && !data && <p className="text-gray-400 text-sm py-4">Loading products…</p>}
      {data && data.products.length === 0 && (
        <p className="text-gray-400 text-sm py-4 text-center">No product sales in this period.</p>
      )}

      {data && data.products.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-100">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Product</th>
                <th className="py-2 pr-3 text-right">Units</th>
                <th className="py-2 pr-3 text-right">Revenue</th>
                <th className="py-2 text-right">Orders</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((p, i) => (
                <tr key={p.slug} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 pr-3 text-gray-400">{i + 1}</td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt={p.name} className="w-9 h-9 rounded-md object-cover bg-gray-100 shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-md bg-gray-100 shrink-0" />
                      )}
                      <span className="font-medium text-gray-800 truncate">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-right font-semibold">{p.units}</td>
                  <td className="py-2.5 pr-3 text-right font-semibold">{fmtKD(p.revenue)}</td>
                  <td className="py-2.5 text-right text-gray-600">{p.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
