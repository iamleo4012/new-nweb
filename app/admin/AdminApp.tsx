"use client";

import { useCallback, useEffect, useState } from "react";
import { MasterDataTab } from "@/app/admin/_components/MasterDataTab";
import { ProductsTab } from "@/app/admin/_components/ProductsTab";

type Tab = "dashboard" | "products" | "orders" | "master-data";

const TAB_LABELS: Record<Tab, string> = {
  dashboard: "dashboard",
  products: "products",
  orders: "orders",
  "master-data": "Master Data",
};

interface Totals {
  orders: number;
  revenue: number;
  products: number;
  customers: number;
}

interface StatsData {
  totals: Totals;
  ordersByStatus: { status: string; count: number }[];
  lowStock: { slug: string; name: string; stock: number; sku: string }[];
  recentOrders: { orderNumber: string; customerName: string; status: string; total: number; currency: string; createdAt: string }[];
  topProducts: { slug: string; name: string; sold: number }[];
}

interface AdminOrder {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  notes: string;
  status: string;
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  createdAt: string;
  items: { slug: string; name: string; price: number; quantity: number }[];
}

const STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PACKING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PACKING: "bg-indigo-100 text-indigo-800",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-gray-100 text-gray-600",
  REJECTED: "bg-red-100 text-red-800",
};

function fmt(n: number): string {
  return n.toFixed(3);
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function AdminApp({ initialTab }: { initialTab: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [authState, setAuthState] = useState<"loading" | "ok" | "denied">("loading");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => {
        const role = data?.data?.user?.role;
        if (role === "ADMIN" || role === "STAFF") {
          setUserName(data.data.user.name);
          setAuthState("ok");
        } else {
          setAuthState("denied");
        }
      })
      .catch(() => setAuthState("denied"));
  }, []);

  if (authState === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading admin panel…</div>;
  }
  if (authState === "denied") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-700 font-semibold">Staff access required.</p>
        <a href="/index.html" className="text-blue-600 underline">
          Return to store and sign in with a staff account
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg tracking-wide">AL-NASSIM Admin</span>
            <nav className="flex gap-1 ml-6">
              {(["dashboard", "products", "orders", "master-data"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-md text-sm capitalize ${tab === t ? "bg-white text-gray-900 font-semibold" : "text-gray-300 hover:text-white"}`}
                >
                  {TAB_LABELS[t]}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-300">{userName}</span>
            <a href="/index.html" className="text-gray-300 hover:text-white">
              Storefront
            </a>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "products" && <ProductsTab />}
        {tab === "orders" && <OrdersTab />}
        {tab === "master-data" && <MasterDataTab />}
      </main>
    </div>
  );
}

function DashboardTab() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setStats(data.data);
        else setError(data.error || "Failed to load stats");
      })
      .catch(() => setError("Failed to load stats"));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!stats) return <p className="text-gray-500">Loading…</p>;

  const cards = [
    { label: "Total Orders", value: String(stats.totals.orders) },
    { label: "Revenue (KD)", value: fmt(stats.totals.revenue) },
    { label: "Active Products", value: String(stats.totals.products) },
    { label: "Customers", value: String(stats.totals.customers) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{c.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">Orders by Status</h2>
          <ul className="space-y-2">
            {stats.ordersByStatus.map((s) => (
              <li key={s.status} className="flex justify-between items-center text-sm">
                <StatusBadge status={s.status} />
                <span className="font-semibold">{s.count}</span>
              </li>
            ))}
            {stats.ordersByStatus.length === 0 && <li className="text-sm text-gray-500">No orders yet</li>}
          </ul>
        </section>
        <section className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">Top Selling Products</h2>
          <ul className="space-y-2">
            {stats.topProducts.map((p) => (
              <li key={p.slug} className="flex justify-between text-sm">
                <span className="truncate mr-3">{p.name}</span>
                <span className="font-semibold whitespace-nowrap">{p.sold} sold</span>
              </li>
            ))}
            {stats.topProducts.length === 0 && <li className="text-sm text-gray-500">No sales yet</li>}
          </ul>
        </section>
        <section className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">Low Stock (≤ 10)</h2>
          <ul className="space-y-2">
            {stats.lowStock.map((p) => (
              <li key={p.slug} className="flex justify-between text-sm">
                <span className="truncate mr-3">{p.name}</span>
                <span className={`font-semibold ${p.stock === 0 ? "text-red-600" : "text-amber-600"}`}>{p.stock} left</span>
              </li>
            ))}
            {stats.lowStock.length === 0 && <li className="text-sm text-gray-500">All products sufficiently stocked</li>}
          </ul>
        </section>
        <section className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">Recent Orders</h2>
          <ul className="space-y-2">
            {stats.recentOrders.map((o) => (
              <li key={o.orderNumber} className="flex justify-between items-center text-sm gap-2">
                <span className="font-mono text-xs">{o.orderNumber}</span>
                <StatusBadge status={o.status} />
                <span className="font-semibold whitespace-nowrap">
                  {fmt(o.total)} {o.currency}
                </span>
              </li>
            ))}
            {stats.recentOrders.length === 0 && <li className="text-sm text-gray-500">No orders yet</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(() => {
    const url = filter ? `/api/admin/orders?status=${filter}` : "/api/admin/orders";
    fetch(url, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setOrders(data.data.orders);
        else setError(data.error || "Failed to load orders");
      })
      .catch(() => setError("Failed to load orders"));
  }, [filter]);

  useEffect(load, [load]);

  async function changeStatus(id: number, status: string) {
    setError("");
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json();
    if (data.success) {
      setOrders((prev) => prev.map((o) => (o.id === id ? data.data.order : o)));
    } else {
      setError(data.error || "Status update failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-500">{orders.length} orders</span>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="bg-white rounded-xl shadow-sm border border-gray-100">
            <button
              onClick={() => setExpanded(expanded === o.id ? null : o.id)}
              className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <div>
                <span className="font-mono text-sm font-semibold">{o.orderNumber}</span>
                <span className="text-sm text-gray-600 ml-3">{o.customerName}</span>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={o.status} />
                <span className="font-semibold text-sm">
                  {fmt(o.total)} {o.currency}
                </span>
                <span className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</span>
              </div>
            </button>
            {expanded === o.id && (
              <div className="border-t px-4 py-3 grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p>
                    <span className="text-gray-500">Email:</span> {o.customerEmail}
                  </p>
                  <p>
                    <span className="text-gray-500">Phone:</span> {o.customerPhone}
                  </p>
                  <p>
                    <span className="text-gray-500">Address:</span> {o.address}, {o.city}
                  </p>
                  {o.notes && (
                    <p>
                      <span className="text-gray-500">Notes:</span> {o.notes}
                    </p>
                  )}
                  <div className="pt-2">
                    <span className="text-gray-500 block mb-1">Set status:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          onClick={() => changeStatus(o.id, s)}
                          disabled={s === o.status}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                            s === o.status
                              ? "bg-gray-900 text-white border-gray-900"
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                          }`}
                        >
                          {s.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-1">Item</th>
                        <th className="py-1">Qty</th>
                        <th className="py-1 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.items.map((i, idx) => (
                        <tr key={idx}>
                          <td className="py-1">{i.name}</td>
                          <td className="py-1">{i.quantity}</td>
                          <td className="py-1 text-right">{fmt(i.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t">
                        <td colSpan={2} className="py-1 text-gray-500">
                          Shipping
                        </td>
                        <td className="py-1 text-right">{fmt(o.shipping)}</td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="py-1 font-semibold">
                          Total
                        </td>
                        <td className="py-1 text-right font-semibold">
                          {fmt(o.total)} {o.currency}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
        {orders.length === 0 && <p className="text-gray-500 text-sm">No orders found.</p>}
      </div>
    </div>
  );
}
