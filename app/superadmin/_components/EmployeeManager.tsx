"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend, fmtDate } from "./shared";

/**
 * Employee management — SUPERADMIN only (the API enforces requireOwner).
 * Roles are limited to ADMIN and SUPERADMIN by design; STAFF is not part of
 * this phase. Destructive/privilege operations ask for confirmation and the
 * consequences are spelled out; the server independently re-validates every
 * rule (self-protection, last-active-SUPERADMIN, transactions).
 */

interface Employee {
  id: number; name: string; email: string; phone: string;
  role: "ADMIN" | "SUPERADMIN"; designation: string; isActive: boolean;
  createdAt: string; updatedAt: string;
}

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-blue-100 text-blue-800",
  SUPERADMIN: "bg-violet-100 text-violet-800",
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
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
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500";

export default function EmployeeManager({ meId }: { meId: number | null }) {
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [designations, setDesignations] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState("");
  const [designation, setDesignation] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [resetting, setResetting] = useState<Employee | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ emp: Employee; kind: "deactivate" | "activate" | "demote" | "promote" } | null>(null);

  const load = useCallback(async () => {
    const p = new URLSearchParams({ sort });
    if (q) p.set("q", q);
    if (role) p.set("role", role);
    if (active) p.set("active", active);
    if (designation) p.set("designation", designation);
    const res = await apiGet<{ employees: Employee[]; designations: string[] }>(`/api/superadmin/employees?${p}`);
    if (res.success && res.data) {
      setEmployees(res.data.employees);
      setDesignations(res.data.designations);
    } else setError(res.error || "Failed to load employees");
  }, [q, role, active, designation, sort]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  async function runConfirm() {
    if (!confirmAction) return;
    const { emp, kind } = confirmAction;
    setConfirmAction(null);
    let res;
    if (kind === "deactivate") res = await apiSend(`/api/superadmin/employees/${emp.id}`, "PATCH", { isActive: false });
    if (kind === "activate") res = await apiSend(`/api/superadmin/employees/${emp.id}`, "PATCH", { isActive: true });
    if (kind === "demote") res = await apiSend(`/api/superadmin/employees/${emp.id}`, "PATCH", { role: "ADMIN" });
    if (kind === "promote") res = await apiSend(`/api/superadmin/employees/${emp.id}`, "PATCH", { role: "SUPERADMIN" });
    if (res && res.success) setNotice("Employee updated.");
    else setError(res?.error || "Operation failed");
    load();
  }

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700">Employee Management</h2>
            <p className="text-xs text-gray-400 mt-0.5">Admin &amp; Superadmin accounts · {employees?.length ?? "…"} listed</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg"
          >
            + Add Employee
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email…"
            className={`${inputCls} max-w-xs`}
          />
          <select value={role} onChange={(e) => setRole(e.target.value)} className={`${inputCls} max-w-[10rem]`}>
            <option value="">All roles</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPERADMIN">Superadmin</option>
          </select>
          <select value={active} onChange={(e) => setActive(e.target.value)} className={`${inputCls} max-w-[10rem]`}>
            <option value="">Active &amp; inactive</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
          <select value={designation} onChange={(e) => setDesignation(e.target.value)} className={`${inputCls} max-w-[12rem]`}>
            <option value="">All designations</option>
            {designations.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")} className={`${inputCls} max-w-[10rem]`}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        {notice && <p className="text-emerald-600 text-sm mb-3">{notice}</p>}

        {!employees && <p className="text-gray-400 text-sm py-4">Loading employees…</p>}
        {employees && employees.length === 0 && (
          <p className="text-gray-400 text-sm py-4 text-center">No employees match the current filters.</p>
        )}

        {employees && employees.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-100">
                  <th className="py-2 pr-3">Employee</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Designation</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Joined</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const isSelf = meId === emp.id;
                  return (
                    <tr key={emp.id} className={`border-b border-gray-50 last:border-0 ${isSelf ? "bg-amber-50/40" : ""}`}>
                      <td className="py-2.5 pr-3">
                        <span className="font-medium text-gray-800">{emp.name}{isSelf ? " (you)" : ""}</span>
                        <span className="block text-[11px] text-gray-400">{emp.email}{emp.phone ? ` · ${emp.phone}` : ""}</span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ROLE_BADGE[emp.role]}`}>{emp.role}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-gray-600">{emp.designation || "—"}</td>
                      <td className="py-2.5 pr-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${emp.isActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"}`}>
                          {emp.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-gray-500 whitespace-nowrap">{fmtDate(emp.createdAt)}</td>
                      <td className="py-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          <button type="button" onClick={() => setEditing(emp)} className="text-xs font-semibold text-blue-700 hover:underline">Edit</button>
                          <button type="button" onClick={() => setResetting(emp)} className="text-xs font-semibold text-amber-700 hover:underline">Reset password</button>
                          {!isSelf && emp.role === "ADMIN" && emp.isActive && (
                            <button type="button" onClick={() => setConfirmAction({ emp, kind: "promote" })} className="text-xs font-semibold text-violet-700 hover:underline">Promote</button>
                          )}
                          {!isSelf && emp.role === "SUPERADMIN" && (
                            <button type="button" onClick={() => setConfirmAction({ emp, kind: "demote" })} className="text-xs font-semibold text-violet-700 hover:underline">Demote</button>
                          )}
                          {!isSelf && emp.isActive && (
                            <button type="button" onClick={() => setConfirmAction({ emp, kind: "deactivate" })} className="text-xs font-semibold text-red-600 hover:underline">Deactivate</button>
                          )}
                          {!isSelf && !emp.isActive && (
                            <button type="button" onClick={() => setConfirmAction({ emp, kind: "activate" })} className="text-xs font-semibold text-emerald-700 hover:underline">Activate</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <AddEmployeeModal onClose={() => setShowAdd(false)} onDone={(msg) => { setShowAdd(false); setNotice(msg); setError(""); load(); }} />}
      {editing && (
        <EditEmployeeModal
          emp={editing}
          onClose={() => setEditing(null)}
          onDone={(msg) => { setEditing(null); setNotice(msg); setError(""); load(); }}
        />
      )}
      {resetting && (
        <ResetPasswordModal
          emp={resetting}
          onClose={() => setResetting(null)}
          onDone={(msg) => { setResetting(null); setNotice(msg); setError(""); load(); }}
        />
      )}
      {confirmAction && (
        <Modal title="Confirm action" onClose={() => setConfirmAction(null)}>
          <p className="text-sm text-gray-700">
            {confirmAction.kind === "deactivate" && <>Deactivate <b>{confirmAction.emp.name}</b>? They will no longer be able to sign in.</>}
            {confirmAction.kind === "activate" && <>Reactivate <b>{confirmAction.emp.name}</b>?</>}
            {confirmAction.kind === "promote" && <>Promote <b>{confirmAction.emp.name}</b> to <b>SUPERADMIN</b>? They will gain full owner access, including business analytics and employee management.</>}
            {confirmAction.kind === "demote" && <>Demote <b>{confirmAction.emp.name}</b> to <b>ADMIN</b>? They will lose owner-level access. The last active Superadmin cannot be demoted.</>}
          </p>
          <div className="flex justify-end gap-2 mt-5">
            <button type="button" onClick={() => setConfirmAction(null)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
            <button type="button" onClick={runConfirm} className="px-4 py-2 rounded-lg text-sm font-bold bg-slate-900 text-white hover:bg-slate-800">Confirm</button>
          </div>
        </Modal>
      )}
    </section>
  );
}

/* ----------------------------- Add modal ----------------------------- */

function AddEmployeeModal({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", designation: "", role: "ADMIN" as "ADMIN" | "SUPERADMIN" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await apiSend("/api/superadmin/employees", "POST", form);
    setBusy(false);
    if (res.success) onDone(`${form.name} was created as ${form.role}.`);
    else setError(res.error || "Creation failed");
  }

  return (
    <Modal title="Add Employee" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className={inputCls} />
        <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className={inputCls} />
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone (optional)" className={inputCls} />
        <input required type="text" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Initial password (min 8 chars)" className={inputCls} autoComplete="new-password" />
        <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Designation (e.g. Sales Manager)" className={inputCls} />
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "ADMIN" | "SUPERADMIN" })} className={inputCls}>
            <option value="ADMIN">Admin — operational staff</option>
            <option value="SUPERADMIN">Superadmin — full owner access</option>
          </select>
          <p className="text-[11px] text-gray-400 mt-1">The employee can change their password later from their profile.</p>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
          <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg text-sm font-bold bg-amber-500 text-slate-900 hover:bg-amber-400 disabled:opacity-50">{busy ? "Creating…" : "Create Employee"}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ----------------------------- Edit modal ----------------------------- */

function EditEmployeeModal({ emp, onClose, onDone }: { emp: Employee; onClose: () => void; onDone: (msg: string) => void }) {
  const [form, setForm] = useState({ name: emp.name, email: emp.email, phone: emp.phone, designation: emp.designation });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await apiSend(`/api/superadmin/employees/${emp.id}`, "PATCH", form);
    setBusy(false);
    if (res.success) onDone(`${form.name} was updated.`);
    else setError(res.error || "Update failed");
  }

  return (
    <Modal title={`Edit — ${emp.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className={inputCls} />
        <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className={inputCls} />
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className={inputCls} />
        <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Designation" className={inputCls} />
        <p className="text-[11px] text-gray-400">Role, status and password are changed via the row actions.</p>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
          <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50">{busy ? "Saving…" : "Save Changes"}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------- Reset password modal ------------------------- */

function ResetPasswordModal({ emp, onClose, onDone }: { emp: Employee; onClose: () => void; onDone: (msg: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await apiSend(`/api/superadmin/employees/${emp.id}`, "PATCH", { password });
    setBusy(false);
    if (res.success) onDone(`Password reset for ${emp.name}. They must use the new password on next sign-in.`);
    else setError(res.error || "Reset failed");
  }

  return (
    <Modal title={`Reset password — ${emp.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-gray-600">Set a new password for <b>{emp.email}</b>. It is hashed server-side and never logged.</p>
        <input required type="text" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (min 8 chars)" className={inputCls} autoComplete="new-password" />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
          <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg text-sm font-bold bg-amber-500 text-slate-900 hover:bg-amber-400 disabled:opacity-50">{busy ? "Resetting…" : "Reset Password"}</button>
        </div>
      </form>
    </Modal>
  );
}
