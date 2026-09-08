"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/app/admin/_components/ConfirmDialog";

/**
 * Staff management — ADMIN only (the API enforces requireAdmin).
 * Staff accounts are order-processing employees. Roles cannot be changed
 * here: the API schema has no role field, so a second ADMIN can never be
 * created and staff can never be promoted. Destructive operations ask for
 * confirmation; the server independently re-validates every rule.
 */

interface StaffMember {
  id: number; name: string; email: string; phone: string;
  role: string; designation: string; isActive: boolean;
  createdAt: string; updatedAt: string;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

async function api<T>(url: string, init?: RequestInit): Promise<{ success: boolean; data: T | null; error: string | null }> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  return res.json();
}

export default function StaffTab() {
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [q, setQ] = useState("");
  const [active, setActive] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [resetting, setResetting] = useState<StaffMember | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ member: StaffMember; kind: "deactivate" | "activate" } | null>(null);

  const load = useCallback(async () => {
    const p = new URLSearchParams({ sort });
    if (q) p.set("q", q);
    if (active) p.set("active", active);
    const res = await api<{ staff: StaffMember[] }>(`/api/admin/staff?${p}`);
    if (res.success && res.data) {
      setStaff(res.data.staff);
    } else setError(res.error || "Failed to load staff");
  }, [q, active, sort]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  async function runConfirm() {
    if (!confirmAction) return;
    const { member, kind } = confirmAction;
    setConfirmAction(null);
    const res = await api(`/api/admin/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: kind === "activate" }),
    });
    if (res.success) setNotice("Staff account updated.");
    else setError(res.error || "Operation failed");
    load();
  }

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700">Staff Management</h2>
            <p className="text-xs text-gray-400 mt-0.5">Order-processing staff accounts · {staff?.length ?? "…"} listed</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg"
          >
            + Add Staff
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email…"
            className={`${inputCls} max-w-xs`}
          />
          <select value={active} onChange={(e) => setActive(e.target.value)} className={`${inputCls} max-w-[10rem]`}>
            <option value="">Active &amp; inactive</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")} className={`${inputCls} max-w-[10rem]`}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        {notice && <p className="text-green-600 text-sm mb-3">{notice}</p>}

        {!staff && <p className="text-gray-400 text-sm py-4">Loading staff…</p>}
        {staff && staff.length === 0 && (
          <p className="text-gray-400 text-sm py-4 text-center">No staff accounts match the current filters.</p>
        )}

        {staff && staff.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-100">
                  <th className="py-2 pr-3">Staff</th>
                  <th className="py-2 pr-3">Designation</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Joined</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-3">
                      <span className="font-medium text-gray-800">{member.name}</span>
                      <span className="block text-[11px] text-gray-400">{member.email}{member.phone ? ` · ${member.phone}` : ""}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-gray-600">{member.designation || "—"}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${member.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}>
                        {member.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-gray-500 whitespace-nowrap">{fmtDate(member.createdAt)}</td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => setEditing(member)} className="text-xs font-semibold text-blue-700 hover:underline">Edit</button>
                        <button type="button" onClick={() => setResetting(member)} className="text-xs font-semibold text-amber-700 hover:underline">Reset password</button>
                        {member.isActive ? (
                          <button type="button" onClick={() => setConfirmAction({ member, kind: "deactivate" })} className="text-xs font-semibold text-red-600 hover:underline">Deactivate</button>
                        ) : (
                          <button type="button" onClick={() => setConfirmAction({ member, kind: "activate" })} className="text-xs font-semibold text-green-700 hover:underline">Activate</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <AddStaffModal onClose={() => setShowAdd(false)} onDone={(msg) => { setShowAdd(false); setNotice(msg); setError(""); load(); }} />}
      {editing && (
        <EditStaffModal
          member={editing}
          onClose={() => setEditing(null)}
          onDone={(msg) => { setEditing(null); setNotice(msg); setError(""); load(); }}
        />
      )}
      {resetting && (
        <ResetPasswordModal
          member={resetting}
          onClose={() => setResetting(null)}
          onDone={(msg) => { setResetting(null); setNotice(msg); setError(""); load(); }}
        />
      )}
      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.kind === "deactivate" ? "Deactivate staff account?" : "Reactivate staff account?"}
        body={
          confirmAction?.kind === "deactivate"
            ? `${confirmAction.member.name} will no longer be able to sign in. Their active sessions are revoked immediately.`
            : `${confirmAction?.member.name ?? ""} will be able to sign in again.`
        }
        confirmLabel={confirmAction?.kind === "deactivate" ? "Deactivate" : "Reactivate"}
        danger={confirmAction?.kind === "deactivate"}
        onConfirm={runConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </section>
  );
}

/* ----------------------------- Add modal ----------------------------- */

function AddStaffModal({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", designation: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await api("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.success) onDone(`${form.name} was created as a staff account.`);
    else setError(res.error || "Creation failed");
  }

  return (
    <Modal title="Add Staff" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className={inputCls} />
        <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className={inputCls} />
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone (optional)" className={inputCls} />
        <input required type="text" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Initial password (min 8 chars)" className={inputCls} autoComplete="new-password" />
        <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Designation (e.g. Order Processor)" className={inputCls} />
        <p className="text-[11px] text-gray-400">
          Staff accounts manage orders only — products, master data, settings and staff management stay admin-only.
          The staff member can change their password later from their profile.
        </p>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
          <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{busy ? "Creating…" : "Create Staff"}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ----------------------------- Edit modal ----------------------------- */

function EditStaffModal({ member, onClose, onDone }: { member: StaffMember; onClose: () => void; onDone: (msg: string) => void }) {
  const [form, setForm] = useState({ name: member.name, email: member.email, phone: member.phone, designation: member.designation });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await api(`/api/admin/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.success) onDone(`${form.name} was updated.`);
    else setError(res.error || "Update failed");
  }

  return (
    <Modal title={`Edit — ${member.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className={inputCls} />
        <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className={inputCls} />
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className={inputCls} />
        <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Designation" className={inputCls} />
        <p className="text-[11px] text-gray-400">Status and password are changed via the row actions.</p>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
          <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{busy ? "Saving…" : "Save Changes"}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------- Reset password modal ------------------------- */

function ResetPasswordModal({ member, onClose, onDone }: { member: StaffMember; onClose: () => void; onDone: (msg: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await api(`/api/admin/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.success) onDone(`Password reset for ${member.name}. They must use the new password on next sign-in.`);
    else setError(res.error || "Reset failed");
  }

  return (
    <Modal title={`Reset password — ${member.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-gray-600">Set a new password for <b>{member.email}</b>. It is hashed server-side and never logged. Their other sessions are revoked.</p>
        <input required type="text" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (min 8 chars)" className={inputCls} autoComplete="new-password" />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
          <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{busy ? "Resetting…" : "Reset Password"}</button>
        </div>
      </form>
    </Modal>
  );
}
