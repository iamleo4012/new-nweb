"use client";

import { useEffect, useState } from "react";
import { apiGet, fmtDate, fmtKD, STATUS_COLORS, STATUS_LABELS } from "./shared";

interface RecentOrder {
  id: number; orderNumber: string; customerName: string; customerEmail: string;
  status: string; total: number; currency: string; createdAt: string;
}

/**
 * Read-only recent-orders feed. Each row links into the EXISTING
 * /admin/orders management system — the owner dashboard deliberately has no
 * duplicate order-management functionality.
 */
export default function RecentOrders({ limit = 10 }: { limit?: number }) {
  const [orders, setOrders] = useState<RecentOrder[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    apiGet<{ orders: RecentOrder[] }>(`/api/superadmin/orders/recent?limit=${limit}`).then((res) => {
      if (!alive) return;
      if (res.success && res.data) setOrders(res.data.orders);
      else setError(res.error || "Failed to load orders");
    });
    return () => { alive = false; };
  }, [limit]);

  if (error) return <p className="text-red-600 text-sm bg-white rounded-xl border border-gray-100 p-4">{error}</p>;
  if (!orders) return <p className="text-gray-400 text-sm p-4">Loading orders…</p>;
  if (orders.length === 0) return <p className="text-gray-400 text-sm p-4 text-center">No orders yet.</p>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700">Recent Orders</h2>
        <a href="/admin/orders" className="text-xs font-semibold text-amber-700 hover:text-amber-800">
          Open order management →
        </a>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-100">
              <th className="py-2 pr-3">Order</th>
              <th className="py-2 pr-3">Customer</th>
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3 text-right">Amount</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="py-2.5 pr-3 font-semibold text-slate-800">{o.orderNumber}</td>
                <td className="py-2.5 pr-3">
                  <span className="text-gray-800">{o.customerName}</span>
                  <span className="block text-[11px] text-gray-400">{o.customerEmail}</span>
                </td>
                <td className="py-2.5 pr-3 text-gray-500 whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                <td className="py-2.5 pr-3 text-right font-semibold">{fmtKD(o.total)}</td>
                <td className="py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
