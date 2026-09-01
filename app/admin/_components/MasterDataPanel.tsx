"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

type SimpleEntityKey =
  | "brands"
  | "materials"
  | "colors"
  | "sizes"
  | "units"
  | "suppliers"
  | "countries"
  | "taxes";

type HierarchyKey = "departments" | "sections" | "categories" | "subcategories";

type EntityKey = SimpleEntityKey | HierarchyKey;

interface Item {
  id: number;
  slug: string;
  name: string;
  [k: string]: unknown;
}

interface Relation {
  id: number;
  name: string;
  slug?: string;
}

const SIMPLE_ENTITIES: SimpleEntityKey[] = [
  "brands",
  "materials",
  "colors",
  "sizes",
  "units",
  "suppliers",
  "countries",
  "taxes",
];

function isSimple(key: string): key is SimpleEntityKey {
  return SIMPLE_ENTITIES.includes(key as SimpleEntityKey);
}

const PAGE_SIZE = 10;

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function MasterDataPanel({ entity }: { entity: EntityKey }) {
  const simple = isSimple(entity);
  const baseUrl = simple ? `/api/admin/master/${entity}` : `/api/admin/hierarchy/${entity}`;

  const [items, setItems] = useState<Item[]>([]);
  const [departments, setDepartments] = useState<Relation[]>([]);
  const [sections, setSections] = useState<Relation[]>([]);
  const [categories, setCategories] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Item | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Item | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});

  const fields = useMemo(() => fieldConfig(entity), [entity]);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetch(baseUrl, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setItems(data.data.items as Item[]);
        } else setError(data.error || "Failed to load");
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load");
        setLoading(false);
      });
    if (entity === "sections" || entity === "categories" || entity === "subcategories") {
      fetch("/api/admin/hierarchy/departments", { credentials: "same-origin" })
        .then((r) => r.json())
        .then((d) => { if (d.success) setDepartments(d.data.items); });
    }
    if (entity === "categories") {
      fetch("/api/admin/hierarchy/sections", { credentials: "same-origin" })
        .then((r) => r.json())
        .then((d) => { if (d.success) setSections(d.data.items); });
    }
    if (entity === "subcategories") {
      fetch("/api/admin/hierarchy/categories", { credentials: "same-origin" })
        .then((r) => r.json())
        .then((d) => { if (d.success) setCategories(d.data.items); });
    }
  }, [baseUrl, entity]);

  useEffect(load, [load]);
  useEffect(() => setPage(1), [entity, query]);

  function resetForm() {
    const init: Record<string, unknown> = {};
    fields.forEach((f) => {
      init[f.key] = f.default ?? (f.type === "select" || f.type === "multiselect" || f.type === "number" ? "" : "");
    });
    setForm(init);
    setEditing(null);
    setShowForm(false);
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(item: Item) {
    const init: Record<string, unknown> = {};
    fields.forEach((f) => {
      init[f.key] = item[f.key] ?? f.default ?? "";
    });
    setForm(init);
    setEditing(item);
    setShowForm(true);
  }

  async function save() {
    setMessage("");
    setError("");
    const validation = validate(entity, form, fields);
    if (validation) {
      setError(validation);
      return;
    }
    const payload: Record<string, unknown> = {};
    fields.forEach((f) => {
      let v = form[f.key];
      if (f.type === "number") v = v === "" ? undefined : Number(v);
      if (f.key === "departmentId" || f.key === "sectionId" || f.key === "categoryId") {
        v = v === "" || v == null ? (f.required ? v : null) : Number(v);
      }
      payload[f.key] = v;
    });

    let res: Response;
    if (editing) {
      res = await fetch(baseUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ id: editing.id, ...payload }),
      });
    } else {
      res = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
    }
    const data = await res.json();
    if (!data.success) {
      setError(data.error || "Save failed");
      return;
    }
    setMessage(editing ? "Updated" : "Created");
    resetForm();
    load();
  }

  async function del(item: Item) {
    setPendingDelete(null);
    setError("");
    setMessage("");
    const res = await fetch(`${baseUrl}?id=${item.id}`, { method: "DELETE", credentials: "same-origin" });
    const data = await res.json();
    if (!data.success) {
      setError(data.error || "Delete failed");
      return;
    }
    setMessage("Deleted");
    load();
  }

  const filtered = items.filter((it) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return it.name.toLowerCase().includes(q) || it.slug.toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns = fieldConfig(entity).filter((f) => f.showInList);

  function renderCell(item: Item, f: FieldDef) {
    if (f.key === "departmentId") return (item as unknown as { department?: Relation }).department?.name ?? "—";
    if (f.key === "sectionId") return (item as unknown as { section?: Relation }).section?.name ?? "—";
    if (f.key === "categoryId") return (item as unknown as { category?: Relation }).category?.name ?? "—";
    if (f.key === "rate") return Number(item.rate).toFixed(3);
    return String(item[f.key] ?? "");
  }

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete ${pendingDelete ? `"${pendingDelete.name}"` : labelOf(entity)}?`}
        body="This permanently removes the entry. Products referencing it may lose this attribute."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        danger
        onConfirm={() => pendingDelete && del(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or slug…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64"
        />
        <button
          onClick={openCreate}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          + New {labelOf(entity)}
        </button>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {message && <p className="text-green-700 text-sm">{message}</p>}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 grid md:grid-cols-3 gap-3">
          {fields.map((f) => (
            <label key={f.key} className={`text-sm ${f.fullWidth ? "md:col-span-3" : ""}`}>
              <span className="block text-gray-600 mb-1">
                {f.label}
                {f.required ? " *" : ""}
              </span>
              {f.type === "select" && (
                <select
                  value={String(form[f.key] ?? "")}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                >
                  <option value="">{f.placeholder ?? "Select…"}</option>
                  {f.options
                    ? f.options(form, departments, sections, categories).map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))
                    : null}
                </select>
              )}
              {f.type === "text" && (
                <input
                  value={String(form[f.key] ?? "")}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, [f.key]: f.autoSlug ? slugify(e.target.value) : e.target.value }))
                  }
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                />
              )}
              {f.type === "color" && (
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={String(form[f.key] ?? "#000000")}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    className="h-10 w-12 rounded border border-gray-300"
                  />
                  <input
                    value={String(form[f.key] ?? "")}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                  />
                </div>
              )}
              {f.type === "number" && (
                <input
                  type="number"
                  step={f.step ?? "1"}
                  value={String(form[f.key] ?? "")}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                />
              )}
              {f.type === "selectEnum" && (
                <select
                  value={String(form[f.key] ?? "")}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                >
                  <option value="">{f.placeholder ?? "Select…"}</option>
                  {f.enumValues?.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              )}
            </label>
          ))}
          <div className="md:col-span-3 flex gap-2">
            <button
              onClick={save}
              className="bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold"
            >
              {editing ? "Update" : "Create"}
            </button>
            <button
              onClick={resetForm}
              className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              {columns.filter((c) => c.key !== "name" && c.key !== "slug").map((c) => (
                <th key={c.key} className="px-4 py-3">
                  {c.label}
                </th>
              ))}
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns.length + 3} className="px-4 py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && pageItems.map((item) => (
              <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-900">{item.name}</td>
                <td className="px-4 py-2 text-xs text-gray-500 font-mono">{item.slug}</td>
                {columns
                  .filter((c) => c.key !== "name" && c.key !== "slug")
                  .map((c) => (
                    <td key={c.key} className="px-4 py-2 text-gray-600">
                      {renderCell(item, c)}
                    </td>
                  ))}
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button
                    onClick={() => openEdit(item)}
                    className="px-2 py-1 mr-2 rounded text-xs font-semibold bg-blue-100 text-blue-800 hover:bg-blue-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setPendingDelete(item)}
                    className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800 hover:bg-red-200"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!loading && pageItems.length === 0 && (
              <tr>
                <td colSpan={columns.length + 3} className="px-4 py-6 text-center text-gray-500">
                  No records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{filtered.length} records</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="px-3 py-1">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function labelOf(entity: EntityKey): string {
  const all: Record<EntityKey, string> = {
    brands: "Brand",
    materials: "Material",
    colors: "Color",
    sizes: "Size",
    units: "Unit",
    suppliers: "Supplier",
    countries: "Country",
    taxes: "Tax",
    departments: "Department",
    sections: "Section",
    categories: "Category",
    subcategories: "Subcategory",
  };
  return all[entity];
}

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "selectEnum" | "color" | "multiselect";
  required?: boolean;
  showInList?: boolean;
  fullWidth?: boolean;
  default?: unknown;
  step?: string;
  placeholder?: string;
  autoSlug?: boolean;
  enumValues?: string[];
  options?: (
    form: Record<string, unknown>,
    departments: Relation[],
    sections: Relation[],
    categories: Relation[]
  ) => Relation[];
}

function fieldConfig(entity: EntityKey): FieldDef[] {
  switch (entity) {
    case "brands":
      return [
        { key: "name", label: "Name", type: "text", required: true, showInList: true },
        { key: "slug", label: "Slug", type: "text", required: true, autoSlug: true },
      ];
    case "materials":
      return [
        { key: "name", label: "Name", type: "text", required: true, showInList: true },
        { key: "slug", label: "Slug", type: "text", required: true, autoSlug: true },
      ];
    case "colors":
      return [
        { key: "name", label: "Name", type: "text", required: true, showInList: true },
        { key: "slug", label: "Slug", type: "text", required: true, autoSlug: true },
        { key: "hex", label: "Hex", type: "color", showInList: true },
      ];
    case "sizes":
      return [
        { key: "name", label: "Name", type: "text", required: true, showInList: true },
        { key: "slug", label: "Slug", type: "text", required: true, autoSlug: true },
      ];
    case "units":
      return [
        { key: "name", label: "Name", type: "text", required: true, showInList: true },
        { key: "slug", label: "Slug", type: "text", required: true, autoSlug: true },
      ];
    case "suppliers":
      return [
        { key: "name", label: "Name", type: "text", required: true, showInList: true, fullWidth: true },
        { key: "slug", label: "Slug", type: "text", required: true, autoSlug: true },
        { key: "contact", label: "Contact", type: "text", showInList: true },
        { key: "phone", label: "Phone", type: "text" },
        { key: "email", label: "Email", type: "text" },
      ];
    case "countries":
      return [
        { key: "name", label: "Name", type: "text", required: true, showInList: true },
        { key: "slug", label: "Slug", type: "text", required: true, autoSlug: true },
      ];
    case "taxes":
      return [
        { key: "name", label: "Name", type: "text", required: true, showInList: true },
        { key: "slug", label: "Slug", type: "text", required: true, autoSlug: true },
        { key: "rate", label: "Rate (%)", type: "number", required: true, showInList: true, step: "0.001" },
      ];
    case "departments":
      return [
        { key: "name", label: "Name", type: "text", required: true, showInList: true },
        { key: "slug", label: "Slug", type: "text", required: true, autoSlug: true },
        {
          key: "purchaseMode",
          label: "Purchase Mode",
          type: "selectEnum",
          required: true,
          showInList: true,
          enumValues: ["ONLINE", "INQUIRY"],
        },
      ];
    case "sections":
      return [
        { key: "name", label: "Name", type: "text", required: true, showInList: true },
        { key: "slug", label: "Slug", type: "text", required: true, autoSlug: true },
        {
          key: "departmentId",
          label: "Department",
          type: "select",
          required: true,
          showInList: true,
          options: (_f, depts) => depts,
        },
      ];
    case "categories":
      return [
        { key: "name", label: "Name", type: "text", required: true, showInList: true },
        { key: "slug", label: "Slug", type: "text", required: true, autoSlug: true },
        {
          key: "departmentId",
          label: "Department",
          type: "select",
          required: true,
          showInList: true,
          options: (_f, depts) => depts,
        },
        {
          key: "sectionId",
          label: "Section (optional)",
          type: "select",
          required: false,
          showInList: true,
          options: (f, _d, secs) => {
            const deptId = Number(f.departmentId);
            if (!deptId) return secs;
            return secs.filter((s) => {
              const anySection = s as unknown as { departmentId?: number; department?: Relation };
              return (
                anySection.departmentId === deptId ||
                (anySection.department && anySection.department.id === deptId)
              );
            });
          },
        },
      ];
    case "subcategories":
      return [
        { key: "name", label: "Name", type: "text", required: true, showInList: true },
        { key: "slug", label: "Slug", type: "text", required: true, autoSlug: true },
        {
          key: "categoryId",
          label: "Category",
          type: "select",
          required: true,
          showInList: true,
          options: (_f, _d, _s, cats) => cats,
        },
      ];
  }
}

function validate(
  entity: EntityKey,
  form: Record<string, unknown>,
  fields: FieldDef[]
): string | null {
  for (const f of fields) {
    if (!f.required) continue;
    const v = form[f.key];
    if (v === "" || v == null) return `${f.label} is required`;
  }
  if (entity === "taxes") {
    const r = Number(form.rate);
    if (!Number.isFinite(r) || r < 0) return "Tax rate must be a non-negative number";
  }
  if (entity === "colors") {
    const h = form.hex as string;
    if (h && !/^#?[0-9a-fA-F]{3,8}$/.test(h)) return "Invalid hex color";
  }
  return null;
}
