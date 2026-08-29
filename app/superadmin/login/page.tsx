"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Owner login — posts to the SHARED /api/auth/login and admits SUPERADMIN
 * only (client-side convenience; the middleware page gate and requireOwner()
 * on every API remain the real boundaries).
 */
function SuperadminLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const redirect = search.get("redirect") || "/superadmin";
  const safeRedirect = redirect.startsWith("/superadmin") ? redirect : "/superadmin";

  useEffect(() => {
    // Already signed in as an owner? Skip straight to the dashboard.
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.user?.role === "SUPERADMIN") router.replace(safeRedirect);
      })
      .catch(() => {});
  }, [router, safeRedirect]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success && data.data?.user) {
        if (data.data.user.role === "SUPERADMIN") {
          router.push(safeRedirect);
          return;
        }
        setError("This account does not have owner access.");
      } else {
        setError(data.error || "Invalid email or password.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <p className="text-amber-500 text-xs font-bold uppercase tracking-[0.3em] mb-2">Al Nassim Golden Group</p>
          <h1 className="text-2xl font-bold text-white">Owner Dashboard</h1>
          <p className="text-slate-400 text-sm mt-2">Superadmin access only</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="owner@alnassim.com"
            />
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-slate-950 font-bold text-sm uppercase tracking-widest py-3 rounded-lg transition-colors"
          >
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p className="text-center text-slate-500 text-xs mt-6">
          <a href="/admin/login" className="hover:text-slate-300">Staff login</a>
          <span className="mx-2">·</span>
          <a href="/home.html" className="hover:text-slate-300">Website</a>
        </p>
      </div>
    </main>
  );
}

// useSearchParams() requires a Suspense boundary for static prerendering
// (same pattern as admin/login) — without it `next build` fails on this page.
export default function SuperadminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading…</div>}>
      <SuperadminLoginForm />
    </Suspense>
  );
}
