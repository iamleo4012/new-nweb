"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

interface Customer {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  orderCount: number;
  addressCount: number;
  cartCount: number;
  wishlistCount: number;
}

interface CustomerDetail {
  user: Customer;
  addresses: Array<{
    id: number;
    label: string;
    fullName: string;
    phone: string;
    address: string;
    city: string;
    area: string;
    isDefault: boolean;
  }>;
  orders: Array<{
    id: number;
    orderNumber: string;
    status: string;
    subtotal: number;
    shipping: number;
    total: number;
    currency: string;
    createdAt: string;
    itemCount: number;
    items: Array<{ id: number; name: string; slug: string; price: number; quantity: number }>;
    timeline: Array<{ id: number; status: string; note: string; createdAt: string }>;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PACKING: "bg-indigo-100 text-indigo-800",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-gray-100 text-gray-600",
  REJECTED: "bg-red-100 text-red-800",
  REFUNDED: "bg-orange-100 text-orange-800",
};

export function CustomersTab() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  // Deactivation is a high-impact action (locks the account out) and is
  // confirmed in a dialog; (re-)activation is safe and fires immediately.
  const [confirmDeactivate, setConfirmDeactivate] = useState<Customer | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (roleFilter) params.set("role", roleFilter);
    fetch(`/api/admin/customers?${params}`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setCustomers(d.data.customers);
          setTotal(d.data.total);
        } else setError(d.error || "Failed to load");
        setLoading(false);
      })
      .catch(() => { setError("Failed to load"); setLoading(false); });
  }, [query, roleFilter]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    setDetailLoading(true);
    fetch(`/api/admin/customers/${selectedId}`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setDetail(d.data);
        else setError(d.error || "Failed to load customer");
        setDetailLoading(false);
      })
      .catch(() => { setError("Failed to load customer"); setDetailLoading(false); });
  }, [selectedId]);

  async function toggleActive(c: Customer) {
    if (toggling) return;
    setToggling(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch(`/api/admin/customers/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      const d = await res.json();
      if (d.success) {
        setCustomers((prev) => prev.map((x) => x.id === c.id ? { ...x, isActive: !c.isActive } : x));
        setDetail((prev) => prev && prev.user.id === c.id ? { ...prev, user: { ...prev.user, isActive: !c.isActive } } : prev);
        setMessage(c.isActive ? "Account deactivated" : "Account activated");
      } else setError(d.error || "Update failed");
    } catch {
      setError("Network error while updating account");
    } finally {
      setToggling(false);
    }
  }

  if (selectedId) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedId(null)} className="text-sm text-blue-600 hover:underline">
          ← Back to customer list
        </button>
        {detailLoading && <p className="text-gray-500 text-sm">Loading…</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {message && <p className="text-green-700 text-sm">{message}</p>}
        {detail && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{detail.user.name}</h2>
                  <p className="text-sm text-gray-600">{detail.user.email} · {detail.user.phone || "No phone"}</p>
                  <p className="text-xs text-gray-400 mt-1">Role: {detail.user.role} · Joined: {new Date(detail.user.createdAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => {
                    if (detail.user.isActive) setConfirmDeactivate(detail.user);
                    else toggleActive(detail.user);
                  }}
                  disabled={toggling}
                  className={`px-3 py-1 rounded-full text-xs font-semibold disabled:opacity-50 ${detail.user.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}
                >
                  {toggling ? "Updating…" : detail.user.isActive ? "Active" : "Inactive"}
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3">Addresses ({detail.addresses.length})</h3>
                {detail.addresses.length === 0 && <p className="text-sm text-gray-500">No saved addresses</p>}
                <ul className="space-y-2">
                  {detail.addresses.map((a) => (
                    <li key={a.id} className="text-sm border-l-2 pl-3" style={{ borderColor: a.isDefault ? "#3b82f6" : "#d1d5db" }}>
                      <p className="font-medium">{a.label} {a.isDefault && <span className="text-xs text-blue-600">(Default)</span>}</p>
                      <p className="text-gray-600">{a.fullName} · {a.phone}</p>
                      <p className="text-gray-600">{a.address}, {a.city}{a.area ? `, ${a.area}` : ""}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3">Order History ({detail.orders.length})</h3>
                {detail.orders.length === 0 && <p className="text-sm text-gray-500">No orders</p>}
                <ul className="space-y-2">
                  {detail.orders.map((o) => (
                    <li key={o.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-mono text-xs font-semibold">{o.orderNumber}</span>
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {o.status.replace(/_/g, " ")}
                        </span>
                        <p className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString()} · {o.itemCount} items</p>
                      </div>
                      <span className="font-semibold">{Number(o.total).toFixed(3)} {o.currency}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {detail.orders.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3">Order Items &amp; Timeline</h3>
                <div className="space-y-4">
                  {detail.orders.map((o) => (
                    <div key={o.id} className="border-l-2 border-gray-100 pl-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-sm font-semibold">{o.orderNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {o.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <table className="w-full text-xs mb-2">
                        <thead>
                          <tr className="text-left text-gray-500">
                            <th className="py-1">Item</th>
                            <th className="py-1 text-right">Qty</th>
                            <th className="py-1 text-right">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {o.items.map((i) => (
                            <tr key={i.id} className="border-t">
                              <td className="py-1">{i.name}</td>
                              <td className="py-1 text-right">{i.quantity}</td>
                              <td className="py-1 text-right">{Number(i.price).toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {o.timeline.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {o.timeline.map((t, idx) => (
                            <span key={t.id} className="text-xs text-gray-500">
                              {idx > 0 && "→ "}{t.status.replace(/_/g, " ")}
                              <span className="text-gray-400 ml-1">({new Date(t.createdAt).toLocaleDateString()})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <ConfirmDialog
          open={confirmDeactivate !== null}
          title="Deactivate this account?"
          body={
            confirmDeactivate
              ? `${confirmDeactivate.name} (${confirmDeactivate.email}) will be unable to sign in or place orders until reactivated.\n\nTheir order history is preserved.`
              : ""
          }
          confirmLabel="Deactivate"
          danger
          busy={toggling}
          onConfirm={() => {
            const target = confirmDeactivate;
            setConfirmDeactivate(null);
            if (target) toggleActive(target);
          }}
          onCancel={() => setConfirmDeactivate(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, phone…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All roles</option>
          <option value="CUSTOMER">Customers</option>
          <option value="STAFF">Staff</option>
          <option value="ADMIN">Admins</option>
          <option value="SUPERADMIN">Superadmin</option>
        </select>
        <span className="text-sm text-gray-500">{total} users</span>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {message && <p className="text-green-700 text-sm">{message}</p>}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Addresses</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">Loading…</td></tr>
            )}
            {!loading && customers.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedId(c.id)}>
                <td className="px-4 py-2 font-medium text-gray-900">{c.name}</td>
                <td className="px-4 py-2 text-gray-600">{c.email}</td>
                <td className="px-4 py-2 text-gray-600">{c.phone || "—"}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.role === "ADMIN" ? "bg-purple-100 text-purple-800" : c.role === "STAFF" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}>
                    {c.role}
                  </span>
                </td>
                <td className="px-4 py-2 font-semibold">{c.orderCount}</td>
                <td className="px-4 py-2 font-semibold">{c.addressCount}</td>
                <td className="px-4 py-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${c.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}>
                    {c.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && customers.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
