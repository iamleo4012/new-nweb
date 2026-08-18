"use client";

import { useEffect, useState } from "react";
import { apiGet } from "./shared";

interface StockProduct {
  id: number; slug: string; name: string; image: string; stock: number; minStock: number; sku: string;
}
interface StockData {
  totals: { totalStock: number; lowStock: number; outOfStock: number };
  lowStock: StockProduct[];
  outOfStock: StockProduct[];
  highest: StockProduct[];
  lowest: StockProduct[];
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" | "danger" }) {
  const cls = tone === "danger" ? "text-red-600" : tone === "warn" ? "text-amber-600" : "text-slate-900";
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${cls}`}>{value}</p>
    </div>
  );
}

function ProductRow({ p, alert }: { p: StockProduct; alert?: boolean }) {
  return (
    <li className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      {p.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.image} alt={p.name} className="w-8 h-8 rounded-md object-cover bg-gray-100 shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-md bg-gray-100 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
        {p.sku && <p className="text-[11px] text-gray-400">{p.sku}</p>}
      </div>
      <span className={`text-xs font-bold ${alert ? (p.stock <= 0 ? "text-red-600" : "text-amber-600") : "text-gray-600"}`}>
        {p.stock} / min {p.minStock}
      </span>
    </li>
  );
}

export default function StockMonitor() {
  const [data, setData] = useState<StockData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    apiGet<StockData>("/api/superadmin/stock").then((res) => {
      if (!alive) return;
      if (res.success && res.data) setData(res.data);
      else setError(res.error || "Failed to load stock");
    });
    return () => { alive = false; };
  }, []);

  if (error) return <p className="text-red-600 text-sm bg-white rounded-xl border border-gray-100 p-4">{error}</p>;
  if (!data) return <p className="text-gray-400 text-sm p-4">Loading stock…</p>;

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat label="Total Stock (units)" value={String(data.totals.totalStock)} />
        <Stat label="Low Stock Products" value={String(data.totals.lowStock)} tone={data.totals.lowStock > 0 ? "warn" : undefined} />
        <Stat label="Out of Stock Products" value={String(data.totals.outOfStock)} tone={data.totals.outOfStock > 0 ? "danger" : undefined} />
      </div>

      {data.lowStock.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-bold uppercase tracking-widest text-amber-600 mb-1">⚠ Low Stock Alerts</h3>
          <p className="text-xs text-gray-400 mb-2">These products have reached their minimum stock level.</p>
          <ul>
            {data.lowStock.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt={p.name} className="w-8 h-8 rounded-md object-cover bg-gray-100 shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-md bg-gray-100 shrink-0" />
                )}
                <span className="text-sm font-medium text-gray-800 truncate flex-1">{p.name}</span>
                <span className="text-xs font-bold text-amber-600 whitespace-nowrap">— {p.stock} remaining</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.outOfStock.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-bold uppercase tracking-widest text-red-600 mb-2">Out of Stock</h3>
          <ul>
            {data.outOfStock.map((p) => <ProductRow key={p.id} p={p} alert />)}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-700 mb-2">Highest Stock</h3>
          <ul>{data.highest.map((p) => <ProductRow key={p.id} p={p} />)}</ul>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-700 mb-2">Lowest Stock</h3>
          <ul>{data.lowest.map((p) => <ProductRow key={p.id} p={p} />)}</ul>
        </div>
      </div>
    </section>
  );
}
