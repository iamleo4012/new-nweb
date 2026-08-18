"use client";

import { fmtKD } from "./shared";

export interface OverviewData {
  sales: { total: number; today: number; yesterday: number; thisWeek: number; thisMonth: number; currency: string };
  orders: {
    total: number;
    pending: number;
    inFulfillment: number;
    completed: number;
    cancelled: number;
    byStatus: Record<string, number>;
    returned: null;
  };
  products: { total: number; active: number; totalStock: number; lowStock: number; outOfStock: number };
  customers: number;
}

function Card({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "warn" | "danger" | "good" }) {
  const toneClass =
    tone === "danger" ? "text-red-600" : tone === "warn" ? "text-amber-600" : tone === "good" ? "text-emerald-600" : "text-slate-900";
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${toneClass}`}>{value}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export default function KpiCards({ data, onExport }: { data: OverviewData; onExport: () => void }) {
  const { sales, orders, products, customers } = data;
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700">Business Overview</h2>
        <button
          type="button"
          onClick={onExport}
          className="text-xs font-semibold text-slate-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
        >
          Export CSV
        </button>
      </div>

      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-4 mb-2">Sales</p>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <Card label="Total Sales" value={fmtKD(sales.total)} />
        <Card label="Today" value={fmtKD(sales.today)} />
        <Card label="Yesterday" value={fmtKD(sales.yesterday)} />
        <Card label="This Week" value={fmtKD(sales.thisWeek)} />
        <Card label="This Month" value={fmtKD(sales.thisMonth)} />
      </div>

      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-5 mb-2">Orders</p>
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
        <Card label="Total Orders" value={String(orders.total)} />
        <Card label="Pending" value={String(orders.pending)} tone="warn" />
        <Card label="In Fulfillment" value={String(orders.inFulfillment)} />
        <Card label="Completed" value={String(orders.completed)} tone="good" />
        <Card label="Cancelled" value={String(orders.cancelled)} tone="danger" />
      </div>

      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-5 mb-2">Products &amp; Stock</p>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <Card label="Total Products" value={String(products.total)} hint={`${products.active} active`} />
        <Card label="Total Stock" value={String(products.totalStock)} hint="units on hand" />
        <Card label="Low Stock" value={String(products.lowStock)} tone={products.lowStock > 0 ? "warn" : undefined} />
        <Card label="Out of Stock" value={String(products.outOfStock)} tone={products.outOfStock > 0 ? "danger" : undefined} />
        <Card label="Customers" value={String(customers)} />
      </div>
    </section>
  );
}
