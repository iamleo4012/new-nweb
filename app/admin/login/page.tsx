"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Dedicated Store Orders Staff account (see scripts/create-store-orders-staff.mjs).
// After sign-in this account goes straight to the dedicated Order Page instead
// of the admin dashboard. Identity is matched by email only — the account's
// role, and every other staff/admin account, behave exactly as before.
const STORE_ORDERS_STAFF_EMAIL = "store.orders@alnassim.com";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") || "/admin";
  // Sanitize: strip .html suffix and ensure it starts with /admin.
  // "/internal-orders" (the staff Order Page) is also allowed — it shares the
  // same staff auth and its own middleware gate; everything else falls back
  // to /admin.
  const normalizedRedirect = rawRedirect.replace(/\.html$/, "");
  const redirect = normalizedRedirect.startsWith("/admin") || normalizedRedirect.startsWith("/internal-orders")
    ? normalizedRedirect
    : "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Check if already logged in
  useEffect(() => {
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.user && (data.data.user.role === "ADMIN" || data.data.user.role === "STAFF")) {
          router.push(data.data.user.email === STORE_ORDERS_STAFF_EMAIL ? "/internal-orders.html" : redirect);
        }
      })
      .catch(() => {});
  }, [router, redirect]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success && data.data?.user) {
        const role = data.data.user.role;
        if (role === "ADMIN" || role === "STAFF") {
          router.push(data.data.user.email === STORE_ORDERS_STAFF_EMAIL ? "/internal-orders.html" : redirect);
        } else {
          setError("This account does not have staff access.");
        }
      } else {
        setError(data.error || "Invalid email or password.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="font-bold text-2xl text-white tracking-wide">AL-NASSIM</span>
          </div>
          <p className="text-gray-400 text-sm">Admin Panel Sign In</p>
        </div>
        <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-800">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-300 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="admin@alnassim.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-4 py-3 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
                <span className="text-xs text-gray-400">Remember me</span>
              </label>
              <span className="text-xs text-gray-500">Forgot password?</span>
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-lg text-sm font-bold tracking-wide transition-all ${loading ? "bg-gray-700 text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
          <div className="mt-6 pt-6 border-t border-gray-800 text-center">
            <a href="/home.html" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">← Back to Storefront</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500">Loading…</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
