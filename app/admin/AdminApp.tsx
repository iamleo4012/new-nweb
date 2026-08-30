"use client";

import { useCallback, useEffect, useState } from "react";
import { MasterDataTab } from "@/app/admin/_components/MasterDataTab";
import { ProductsTab } from "@/app/admin/_components/ProductsTab";
import { CustomersTab } from "@/app/admin/_components/CustomersTab";

type Tab = "dashboard" | "products" | "orders" | "master-data" | "customers" | "audit-log";

const TAB_LABELS: Record<Tab, string> = {
  dashboard: "Dashboard",
  products: "Products",
  orders: "Orders",
  "master-data": "Master Data",
  customers: "Customers",
  "audit-log": "Audit Log",
};

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface StatsData {
  totals: { orders: number; products: number; customers: number };
  operational: {
    pendingReview: number;
    waitingConfirmation: number;
    readyForPacking: number;
    readyForDelivery: number;
    deliveredToday: number;
    completedToday: number;
    cancelledToday: number;
    unreadNotifications: number;
  };
  ordersByStatus: { status: string; count: number }[];
  recentOrders: { id: number; orderNumber: string; customerName: string; status: string; total: number; currency: string; createdAt: string }[];
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
  staffNotes: string;
  posStatus: string;
  status: string;
  statusLabel: string;
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  items: {
    id: number;
    slug: string;
    name: string;
    image: string;
    price: number;
    quantity: number;
    itemStatus: string;
  }[];
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const ORDER_STATUSES = [
  "PENDING",
  "UNDER_REVIEW",
  "READY_FOR_CONFIRMATION",
  "CONFIRMED",
  "PACKING",
  "READY_FOR_DELIVERY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED_BY_CUSTOMER",
  "CANCELLED_BY_STAFF",
] as const;

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  UNDER_REVIEW: "bg-blue-100 text-blue-800",
  READY_FOR_CONFIRMATION: "bg-indigo-100 text-indigo-800",
  CONFIRMED: "bg-green-100 text-green-800",
  PACKING: "bg-purple-100 text-purple-800",
  READY_FOR_DELIVERY: "bg-cyan-100 text-cyan-800",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-800",
  DELIVERED: "bg-teal-100 text-teal-800",
  COMPLETED: "bg-gray-200 text-gray-800",
  CANCELLED_BY_CUSTOMER: "bg-red-100 text-red-800",
  CANCELLED_BY_STAFF: "bg-red-100 text-red-800",
};

const ITEM_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  AVAILABLE: "bg-green-100 text-green-800",
  UNAVAILABLE: "bg-red-100 text-red-800",
  REMOVED_AFTER_CONFIRMATION: "bg-gray-200 text-gray-500 line-through",
  DELIVERED: "bg-teal-100 text-teal-800",
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function fmt(n: number): string {
  return n.toFixed(3);
}

function statusLabel(s: string): string {
  return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}>
      {statusLabel(status)}
    </span>
  );
}

function ItemStatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${ITEM_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}>
      {statusLabel(status)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function AdminApp({ initialTab }: { initialTab: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [authState, setAuthState] = useState<"loading" | "ok" | "denied">("loading");
  const [userName, setUserName] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => {
        const role = data?.data?.user?.role;
        if (role === "ADMIN" || role === "STAFF" || role === "SUPERADMIN") {
          setUserName(data.data.user.name);
          setAuthState("ok");
        } else {
          setAuthState("denied");
        }
      })
      .catch(() => setAuthState("denied"));
  }, []);

  // The logout route is POST-only (a plain <a href> would 405). The session
  // row is deleted server-side; the cookie is cleared in the same response.
  function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" })
      .catch(() => {})
      .finally(() => {
        window.location.href = "/admin/login";
      });
  }

  if (authState === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading admin panel…</div>;
  }
  if (authState === "denied") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
          <span className="text-2xl">🔒</span>
        </div>
        <p className="text-gray-700 font-semibold text-lg">Staff access required</p>
        <p className="text-gray-500 text-sm">You need an admin or staff account to access this panel.</p>
        <a href="/admin/login" className="mt-2 px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
          Go to Admin Login
        </a>
        <a href="/home.html" className="text-gray-400 text-xs hover:text-gray-600 mt-2">← Back to Storefront</a>
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
              {(["dashboard", "products", "orders", "master-data", "customers", "audit-log"] as Tab[]).map((t) => (
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
            <a href="/home.html" className="text-gray-300 hover:text-white">
              Storefront
            </a>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-gray-300 hover:text-red-300 disabled:opacity-50"
            >
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "products" && <ProductsTab />}
        {tab === "orders" && <OrdersTab />}
        {tab === "master-data" && <MasterDataTab />}
        {tab === "customers" && <CustomersTab />}
        {tab === "audit-log" && <AuditLogTab />}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard Tab — operational metrics                                 */
/* ------------------------------------------------------------------ */

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

  const op = stats.operational;
  const operationalCards = [
    { label: "Awaiting Review", value: op.pendingReview, color: "text-yellow-600" },
    { label: "Waiting Confirmation", value: op.waitingConfirmation, color: "text-indigo-600" },
    { label: "Ready for Packing", value: op.readyForPacking, color: "text-green-600" },
    { label: "Ready for Delivery", value: op.readyForDelivery, color: "text-cyan-600" },
    { label: "Delivered Today", value: op.deliveredToday, color: "text-teal-600" },
    { label: "Completed Today", value: op.completedToday, color: "text-gray-700" },
    { label: "Cancelled Today", value: op.cancelledToday, color: "text-red-600" },
    { label: "Unread Notifications", value: op.unreadNotifications, color: "text-blue-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {operationalCards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
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
          <h2 className="font-semibold text-gray-900 mb-3">Most Ordered Products</h2>
          <ul className="space-y-2">
            {stats.topProducts.map((p) => (
              <li key={p.slug} className="flex justify-between text-sm">
                <span className="truncate mr-3">{p.name}</span>
                <span className="font-semibold whitespace-nowrap">{p.sold} ordered</span>
              </li>
            ))}
            {stats.topProducts.length === 0 && <li className="text-sm text-gray-500">No orders yet</li>}
          </ul>
        </section>
        <section className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 md:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-3">Recent Orders</h2>
          <ul className="space-y-2">
            {stats.recentOrders.map((o) => (
              <li key={o.orderNumber} className="flex justify-between items-center text-sm gap-2">
                <span className="font-mono text-xs">{o.orderNumber}</span>
                <span className="text-gray-600 truncate">{o.customerName}</span>
                <StatusBadge status={o.status} />
                <span className="font-semibold whitespace-nowrap">{fmt(o.total)} {o.currency}</span>
              </li>
            ))}
            {stats.recentOrders.length === 0 && <li className="text-sm text-gray-500">No orders yet</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Orders Tab — verification workflow                                  */
/* ------------------------------------------------------------------ */

function OrdersTab() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("");
  // Invoice-number search (e.g. AN-2026-000001). Retrieves historical orders
  // even after the original customer account has been deleted.
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (filter) params.set("status", filter);
    if (search) params.set("q", search);
    const url = params.toString() ? `/api/admin/orders?${params.toString()}` : "/api/admin/orders";
    fetch(url, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setOrders(data.data.orders);
        else setError(data.error || "Failed to load orders");
      })
      .catch(() => setError("Failed to load orders"));
  }, [filter, search]);

  useEffect(load, [load]);

  async function patchStatus(id: number, status: string) {
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json();
    if (data.success) {
      setOrders((prev) => prev.map((o) => (o.id === id ? data.data.order : o)));
      setMessage(`Order moved to ${statusLabel(status)}.`);
    } else {
      setError(data.error || "Status update failed");
    }
  }

  async function verifyItems(orderId: number, items: { itemId: number; itemStatus: string }[], notes: string) {
    setError("");
    setMessage("");
    const res = await fetch(`/api/admin/orders/${orderId}/verify`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ items, staffNotes: notes }),
    });
    const data = await res.json();
    if (data.success) {
      setMessage("Item availability updated. Order is under review.");
      load();
    } else {
      setError(data.error || "Verification failed");
    }
  }

  async function sendForConfirmation(id: number) {
    await patchStatus(id, "READY_FOR_CONFIRMATION");
  }

  async function packOrder(id: number, action: string, posStatus?: string) {
    setError("");
    setMessage("");
    const res = await fetch(`/api/admin/orders/${id}/pack`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ action, posStatus }),
    });
    const data = await res.json();
    if (data.success) {
      setMessage(`Order updated: ${data.data.statusLabel}`);
      load();
    } else {
      setError(data.error || "Action failed");
    }
  }

  async function cancelOrder(id: number) {
    await patchStatus(id, "CANCELLED_BY_STAFF");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput.trim());
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search invoice no. (e.g. AN-2026-000001)"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72"
          />
          <button
            type="submit"
            className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm hover:bg-gray-700"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSearchInput("");
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear
            </button>
          )}
        </form>
        <span className="text-sm text-gray-500">{orders.length} orders</span>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {message && <p className="text-green-600 text-sm">{message}</p>}
      <div className="space-y-3">
        {orders.map((o) => (
          <OrderCard
            key={o.id}
            order={o}
            expanded={expanded === o.id}
            onToggle={() => setExpanded(expanded === o.id ? null : o.id)}
            onPatchStatus={patchStatus}
            onVerify={verifyItems}
            onSendConfirmation={sendForConfirmation}
            onPack={packOrder}
            onCancel={cancelOrder}
          />
        ))}
        {orders.length === 0 && <p className="text-gray-500 text-sm">No orders found.</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Order Card — expandable with verification workflow                   */
/* ------------------------------------------------------------------ */

interface OrderCardProps {
  order: AdminOrder;
  expanded: boolean;
  onToggle: () => void;
  onPatchStatus: (id: number, status: string) => void;
  onVerify: (orderId: number, items: { itemId: number; itemStatus: string }[], notes: string) => void;
  onSendConfirmation: (id: number) => void;
  onPack: (id: number, action: string, posStatus?: string) => void;
  onCancel: (id: number) => void;
}

function OrderCard({ order, expanded, onToggle, onPatchStatus, onVerify, onSendConfirmation, onPack, onCancel }: OrderCardProps) {
  const [itemStatusOverrides, setItemStatusOverrides] = useState<Record<number, string>>({});
  const [staffNotes, setStaffNotes] = useState(order.staffNotes || "");

  // Determine available workflow actions based on current status.
  const canVerify = order.status === "PENDING" || order.status === "UNDER_REVIEW";
  const canSendConfirmation = order.status === "UNDER_REVIEW";
  const canStartPacking = order.status === "CONFIRMED";
  const canReadyDelivery = order.status === "PACKING";
  const canDispatch = order.status === "READY_FOR_DELIVERY";
  const canMarkDelivered = order.status === "OUT_FOR_DELIVERY";
  const canComplete = order.status === "DELIVERED";
  const canCancel = !["COMPLETED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_STAFF"].includes(order.status);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <button
        onClick={onToggle}
        className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <span className="font-mono text-sm font-semibold">{order.orderNumber}</span>
          <span className="text-sm text-gray-600 ml-3">{order.customerName}</span>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          <span className="font-semibold text-sm">{fmt(order.total)} {order.currency}</span>
          <span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</span>
        </div>
      </button>
      {expanded && (
        <div className="border-t px-4 py-3 grid md:grid-cols-2 gap-4 text-sm">
          {/* Left column: customer info + workflow actions */}
          <div className="space-y-2">
            <p><span className="text-gray-500">Email:</span> {order.customerEmail}</p>
            <p><span className="text-gray-500">Phone:</span> {order.customerPhone}</p>
            <p><span className="text-gray-500">Address:</span> {order.address}, {order.city}</p>
            {order.notes && <p><span className="text-gray-500">Customer Notes:</span> {order.notes}</p>}
            {order.staffNotes && <p><span className="text-gray-500">Staff Notes:</span> {order.staffNotes}</p>}
            <p><span className="text-gray-500">POS Status:</span> <span className="font-medium">{statusLabel(order.posStatus)}</span></p>

            {/* Workflow actions */}
            <div className="pt-2 space-y-2">
              {canVerify && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-600 uppercase">Mark Item Availability:</p>
                  {order.items.map((item) => {
                    const current = itemStatusOverrides[item.id] ?? item.itemStatus;
                    const isPending = current === "PENDING";
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-2">
                        <span className="truncate flex-1 text-xs">{item.name} (×{item.quantity})</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setItemStatusOverrides((p) => ({ ...p, [item.id]: "AVAILABLE" }))}
                            className={`px-2 py-0.5 rounded text-xs ${current === "AVAILABLE" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-green-100"}`}
                          >
                            ✓ Available
                          </button>
                          <button
                            onClick={() => setItemStatusOverrides((p) => ({ ...p, [item.id]: "UNAVAILABLE" }))}
                            className={`px-2 py-0.5 rounded text-xs ${current === "UNAVAILABLE" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-red-100"}`}
                          >
                            ✗ Unavailable
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <textarea
                    value={staffNotes}
                    onChange={(e) => setStaffNotes(e.target.value)}
                    placeholder="Staff notes (optional)..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs"
                    rows={2}
                  />
                  <button
                    onClick={() => {
                      const items = order.items
                        .filter((i) => itemStatusOverrides[i.id])
                        .map((i) => ({ itemId: i.id, itemStatus: itemStatusOverrides[i.id] }));
                      if (items.length === 0) return;
                      onVerify(order.id, items, staffNotes);
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                  >
                    Save Availability
                  </button>
                </div>
              )}
              {canSendConfirmation && (
                <button
                  onClick={() => onSendConfirmation(order.id)}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
                >
                  → Send for Customer Confirmation
                </button>
              )}
              {canStartPacking && (
                <button
                  onClick={() => onPack(order.id, "pack")}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700"
                >
                  → Start Packing
                </button>
              )}
              {canReadyDelivery && (
                <button
                  onClick={() => onPack(order.id, "ready", "INVOICED")}
                  className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-semibold hover:bg-cyan-700"
                >
                  → Ready for Delivery (Mark POS Invoiced)
                </button>
              )}
              {canDispatch && (
                <button
                  onClick={() => onPack(order.id, "deliver", "HANDED_TO_DELIVERY")}
                  className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-semibold hover:bg-orange-700"
                >
                  → Out for Delivery
                </button>
              )}
              {canMarkDelivered && (
                <button
                  onClick={() => onPack(order.id, "complete")}
                  className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700"
                >
                  → Mark Delivered
                </button>
              )}
              {canComplete && (
                <button
                  onClick={() => onPatchStatus(order.id, "COMPLETED")}
                  className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-xs font-semibold hover:bg-gray-800"
                >
                  → Complete Order
                </button>
              )}
              {canCancel && (
                <button
                  onClick={() => onCancel(order.id)}
                  className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 ml-2"
                >
                  Cancel (Staff)
                </button>
              )}
            </div>
          </div>

          {/* Right column: items table with statuses */}
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-1">Item</th>
                  <th className="py-1">Qty</th>
                  <th className="py-1">Status</th>
                  <th className="py-1 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td className="py-1">{i.name}</td>
                    <td className="py-1">{i.quantity}</td>
                    <td className="py-1"><ItemStatusBadge status={i.itemStatus} /></td>
                    <td className="py-1 text-right">{fmt(i.price)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <td colSpan={3} className="py-1 text-gray-500">Shipping</td>
                  <td className="py-1 text-right">{fmt(order.shipping)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-1 font-semibold">Total (indicative)</td>
                  <td className="py-1 text-right font-semibold">{fmt(order.total)} {order.currency}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Audit Log Tab                                                       */
/* ------------------------------------------------------------------ */

interface AuditLogEntry {
  id: number;
  actorId: number | null;
  actorName: string;
  actorEmail: string;
  action: string;
  entity: string;
  entityId: string;
  detail: string;
  createdAt: string;
}

function AuditLogTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (entityFilter) params.set("entity", entityFilter);
    params.set("page", String(page));
    params.set("limit", "50");
    fetch(`/api/admin/audit-log?${params}`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setLogs(data.data.logs);
          setEntities(data.data.entities);
          setTotalPages(data.data.pagination.totalPages);
          setTotal(data.data.pagination.total);
        } else {
          setError(data.error || "Failed to load audit log");
        }
      })
      .catch(() => setError("Failed to load audit log"))
      .finally(() => setLoading(false));
  }, [search, entityFilter, page]);

  useEffect(load, [load]);

  function exportCsv() {
    const headers = ["ID", "Actor", "Email", "Action", "Entity", "Entity ID", "Detail", "Timestamp"];
    const rows = logs.map((l) => [l.id, l.actorName, l.actorEmail, l.action, l.entity, l.entityId, `"${l.detail.replace(/"/g, '""')}"`, new Date(l.createdAt).toISOString()]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search audit log…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
        />
        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All entities</option>
          {entities.map((en) => <option key={en} value={en}>{en}</option>)}
        </select>
        <button onClick={exportCsv} className="px-3 py-2 bg-gray-700 text-white rounded-lg text-sm font-semibold hover:bg-gray-800">
          Export CSV
        </button>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : (
        <>
          <p className="text-sm text-gray-500">{total} entries (page {page} of {totalPages})</p>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Actor</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Entity</th>
                  <th className="px-4 py-3 text-left">Detail</th>
                  <th className="px-4 py-3 text-left">Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-gray-100">
                    <td className="px-4 py-2">
                      <span className="font-medium">{l.actorName}</span>
                      {l.actorEmail && <span className="text-xs text-gray-400 block">{l.actorEmail}</span>}
                    </td>
                    <td className="px-4 py-2"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono">{l.action}</span></td>
                    <td className="px-4 py-2">{l.entity} {l.entityId && <span className="text-xs text-gray-400">#{l.entityId}</span>}</td>
                    <td className="px-4 py-2 text-gray-600 max-w-xs truncate">{l.detail}</td>
                    <td className="px-4 py-2 text-xs text-gray-400 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No audit entries found.</td></tr>}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 justify-center pt-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 disabled:opacity-50 hover:bg-gray-100">← Prev</button>
              <span className="text-sm text-gray-500">{page} / {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 disabled:opacity-50 hover:bg-gray-100">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
