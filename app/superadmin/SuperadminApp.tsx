"use client";

import { useCallback, useEffect, useState } from "react";
import KpiCards, { type OverviewData } from "./_components/KpiCards";
import DateRangeFilter from "./_components/DateRangeFilter";
import SalesChart from "./_components/SalesChart";
import TopProducts from "./_components/TopProducts";
import CategoryPerformance from "./_components/CategoryPerformance";
import StockMonitor from "./_components/StockMonitor";
import EmployeeManager from "./_components/EmployeeManager";
import RecentOrders from "./_components/RecentOrders";
import ActivityFeed from "./_components/ActivityFeed";
import { apiGet, downloadCsv, fmtKD, type RangeSelection } from "./_components/shared";

/**
 * Superadmin / Owner dashboard — a separate SPA layered ON TOP of the
 * existing system: order management, product management and the audit-log
 * browser remain the existing /admin panel (linked from here). Security is
 * enforced server-side by requireOwner() on every /api/superadmin route;
 * the middleware page gate and the check below are convenience layers.
 */

type Tab = "overview" | "sales" | "products" | "stock" | "employees" | "activity";

const NAV: Array<{ key: Tab; label: string; icon: string }> = [
  { key: "overview", label: "Overview", icon: "▤" },
  { key: "sales", label: "Sales Analytics", icon: "◈" },
  { key: "products", label: "Product Performance", icon: "▦" },
  { key: "stock", label: "Stock Monitoring", icon: "▣" },
  { key: "employees", label: "Employees", icon: "☺" },
  { key: "activity", label: "Activity", icon: "≡" },
];

const TODAY = new Date().toISOString().slice(0, 10);

export default function SuperadminApp() {
  const [authState, setAuthState] = useState<"checking" | "ok" | "denied">("checking");
  const [me, setMe] = useState<{ id: number; name: string; email: string } | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [range, setRange] = useState<RangeSelection>({ key: "30d", from: TODAY, to: TODAY });
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // The logout route is POST-only — a plain <a href="/api/auth/logout">
  // issues a GET and 405s without ending the session.
  function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" })
      .catch(() => {})
      .finally(() => {
        window.location.href = "/superadmin/login";
      });
  }

  useEffect(() => {
    apiGet<{ user: { id: number; name: string; email: string; role: string } | null }>(
      "/api/auth/me"
    ).then((res) => {
      const user = res.data?.user;
      if (res.success && user && user.role === "SUPERADMIN") {
        setMe({ id: user.id, name: user.name, email: user.email });
        setAuthState("ok");
      } else {
        setAuthState("denied");
      }
    });
  }, []);

  const loadOverview = useCallback(async () => {
    const res = await apiGet<OverviewData>("/api/superadmin/overview");
    if (res.success && res.data) setOverview(res.data);
  }, []);

  useEffect(() => {
    if (authState === "ok") loadOverview();
  }, [authState, loadOverview]);

  function exportOverviewCsv() {
    if (!overview) return;
    downloadCsv(
      "overview.csv",
      ["Metric", "Value"],
      [
        ["Total Sales (KD)", overview.sales.total.toFixed(3)],
        ["Today's Sales (KD)", overview.sales.today.toFixed(3)],
        ["Yesterday's Sales (KD)", overview.sales.yesterday.toFixed(3)],
        ["This Week's Sales (KD)", overview.sales.thisWeek.toFixed(3)],
        ["This Month's Sales (KD)", overview.sales.thisMonth.toFixed(3)],
        ["Total Orders", String(overview.orders.total)],
        ["Pending Orders", String(overview.orders.pending)],
        ["Completed Orders", String(overview.orders.completed)],
        ["Cancelled Orders", String(overview.orders.cancelled)],
        ["Total Products", String(overview.products.total)],
        ["Total Stock (units)", String(overview.products.totalStock)],
        ["Low Stock Products", String(overview.products.lowStock)],
        ["Out of Stock Products", String(overview.products.outOfStock)],
        ["Total Customers", String(overview.customers)],
      ]
    );
  }

  if (authState === "checking") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading owner dashboard…</p>
      </main>
    );
  }

  if (authState === "denied") {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-amber-500 text-xs font-bold uppercase tracking-[0.3em] mb-3">Al Nassim Golden Group</p>
          <h1 className="text-2xl font-bold text-white mb-2">Owner access required</h1>
          <p className="text-slate-400 text-sm mb-6">This dashboard is restricted to Superadmin accounts.</p>
          <div className="flex gap-3 justify-center">
            <a href="/superadmin/login" className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-widest px-5 py-3 rounded-lg">Owner Login</a>
            <a href="/home.html" className="border border-slate-700 text-slate-300 text-xs font-bold uppercase tracking-widest px-5 py-3 rounded-lg hover:bg-slate-800">Website</a>
          </div>
        </div>
      </main>
    );
  }

  const rangeDriven = tab === "sales" || tab === "products" || tab === "overview";

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* Side navigation (owner look — dark, distinct from both storefront and admin) */}
      <aside className="lg:w-60 lg:shrink-0 bg-slate-950 text-slate-300 lg:min-h-screen sticky top-0 z-40">
        <div className="px-5 py-4 border-b border-slate-800/60">
          <p className="text-amber-500 text-[10px] font-bold uppercase tracking-[0.3em]">Al Nassim</p>
          <p className="text-white font-bold text-sm mt-0.5">Owner Dashboard</p>
        </div>
        <nav className="flex lg:flex-col overflow-x-auto lg:overflow-visible">
          {NAV.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`flex items-center gap-3 px-5 py-3 text-sm font-medium whitespace- transition-colors ${
                tab === item.key ? "bg-slate-800/60 text-white border-b-2 lg:border-b-0 lg:border-l-2 border-amber-500" : "hover:bg-slate-800/40 hover:text-white"
              }`}
            >
              <span className="text-amber-500/80 text-xs w-4">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        {/* Visible on every viewport — this is the only sign-out control for
            the owner dashboard, so it must not be hidden on mobile. */}
        <div className="px-5 py-4 border-t border-slate-800/60 lg:mt-auto">
          <p className="text-xs text-slate-400 truncate">{me?.name}</p>
          <p className="text-[11px] text-slate-600 truncate">{me?.email}</p>
          <div className="flex gap-3 mt-3">
            <a href="/admin" className="text-[11px] text-slate-400 hover:text-amber-400">Admin Panel</a>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-[11px] text-slate-400 hover:text-red-400 disabled:opacity-50"
            >
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 capitalize">
              {NAV.find((n) => n.key === tab)?.label}
            </h1>
            <p className="text-xs text-gray-400">
              {overview ? `All-time sales ${fmtKD(overview.sales.total)} · ${overview.orders.total} orders · ${overview.customers} customers` : "—"}
            </p>
          </div>
          {rangeDriven && <DateRangeFilter value={range} onChange={setRange} />}
        </header>

        {tab === "overview" && (
          <>
            {overview ? (
              <KpiCards data={overview} onExport={exportOverviewCsv} />
            ) : (
              <p className="text-gray-400 text-sm">Loading overview…</p>
            )}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <RecentOrders limit={8} />
              <ActivityFeed limit={12} />
            </div>
          </>
        )}

        {tab === "sales" && <SalesChart range={range} />}

        {tab === "products" && (
          <div className="space-y-5">
            <TopProducts range={range} />
            <CategoryPerformance range={range} />
          </div>
        )}

        {tab === "stock" && <StockMonitor />}

        {tab === "employees" && <EmployeeManager meId={me?.id ?? null} />}

        {tab === "activity" && <ActivityFeed limit={50} />}
      </main>
    </div>
  );
}
