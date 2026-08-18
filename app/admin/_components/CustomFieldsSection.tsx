"use client";

import { useEffect, useState } from "react";

export type AttributeSectionName = "HEADER" | "DESCRIPTION" | "SPECIFICATIONS";
export type AttributeFieldType = "TEXT" | "LONG_TEXT" | "NUMBER" | "SELECT";

export interface CustomAttributeItem {
  id: number;
  name: string;
  section: AttributeSectionName;
  fieldType: AttributeFieldType;
  options: string[];
  displayOrder: number;
  valueCount: number;
}

interface CustomFieldsSectionProps {
  /** Information area this block manages. */
  section: AttributeSectionName;
  /** Subcategory id ("" when none selected — shows a hint instead of fields). */
  subcategoryId: string;
  /** Live attribute definitions for the selected subcategory (all sections). */
  attributes: CustomAttributeItem[];
  /** Per-product values keyed by attribute id. */
  values: Record<number, string>;
  onValueChange: (id: number, value: string) => void;
  /** Refetch the attribute list after create/edit/delete/reorder. */
  onRefresh: () => void;
  onError: (msg: string) => void;
}

const TYPE_LABELS: Record<AttributeFieldType, string> = {
  TEXT: "Text",
  LONG_TEXT: "Long Text",
  NUMBER: "Number",
  SELECT: "Dropdown",
};

/**
 * Dynamic per-subcategory custom fields for one information area
 * (Header / Description / Specifications).
 *
 * "+ Add Info" defines a field ONCE for the subcategory; it then appears for
 * every product in that subcategory. Fields are always optional — empty
 * values never block saving. Manage controls: rename, retype, reorder,
 * soft-delete (with confirmation; product values are preserved).
 */
export function CustomFieldsSection({
  section,
  subcategoryId,
  attributes,
  values,
  onValueChange,
  onRefresh,
  onError,
}: CustomFieldsSectionProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [addField, setAddField] = useState({ name: "", fieldType: "TEXT" as AttributeFieldType, options: "" });
  const [busy, setBusy] = useState(false);

  const [editId, setEditId] = useState<number | null>(null);
  const [editField, setEditField] = useState({ name: "", fieldType: "TEXT" as AttributeFieldType, options: "" });

  const [deleteTarget, setDeleteTarget] = useState<CustomAttributeItem | null>(null);

  const [showManage, setShowManage] = useState(false);

  const sectionAttrs = attributes
    .filter((a) => a.section === section)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);

  async function createField() {
    if (!subcategoryId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          subcategoryId: Number(subcategoryId),
          name: addField.name,
          section,
          fieldType: addField.fieldType,
          options:
            addField.fieldType === "SELECT"
              ? addField.options.split(",").map((o) => o.trim()).filter(Boolean)
              : [],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAdd(false);
        setAddField({ name: "", fieldType: "TEXT", options: "" });
        onRefresh();
      } else {
        onError(data.error || "Could not create field");
      }
    } catch {
      onError("Could not create field");
    }
    setBusy(false);
  }

  async function saveEdit() {
    if (editId === null) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/attributes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          id: editId,
          name: editField.name,
          fieldType: editField.fieldType,
          options:
            editField.fieldType === "SELECT"
              ? editField.options.split(",").map((o) => o.trim()).filter(Boolean)
              : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditId(null);
        onRefresh();
      } else {
        onError(data.error || "Could not update field");
      }
    } catch {
      onError("Could not update field");
    }
    setBusy(false);
  }

  async function deleteField() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/attributes?id=${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await res.json();
      if (data.success) {
        setDeleteTarget(null);
        onRefresh();
      } else {
        onError(data.error || "Could not delete field");
      }
    } catch {
      onError("Could not delete field");
    }
    setBusy(false);
  }

  async function move(attr: CustomAttributeItem, dir: -1 | 1) {
    const list = [...sectionAttrs];
    const idx = list.findIndex((a) => a.id === attr.id);
    const swapWith = idx + dir;
    if (idx < 0 || swapWith < 0 || swapWith >= list.length) return;
    [list[idx], list[swapWith]] = [list[swapWith], list[idx]];
    try {
      const res = await fetch("/api/admin/attributes/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          subcategoryId: Number(subcategoryId),
          section,
          orderedIds: list.map((a) => a.id),
        }),
      });
      const data = await res.json();
      if (data.success) onRefresh();
      else onError(data.error || "Could not reorder");
    } catch {
      onError("Could not reorder");
    }
  }

  function openEdit(a: CustomAttributeItem) {
    setEditId(a.id);
    setEditField({ name: a.name, fieldType: a.fieldType, options: a.options.join(", ") });
  }

  function renderInput(a: CustomAttributeItem) {
    const val = values[a.id] ?? "";
    const cls = "border border-gray-300 rounded-lg px-3 py-2 w-full";
    if (a.fieldType === "LONG_TEXT") {
      return (
        <textarea
          value={val}
          rows={3}
          onChange={(e) => onValueChange(a.id, e.target.value)}
          placeholder={`${a.name} (optional)`}
          className={cls}
        />
      );
    }
    if (a.fieldType === "SELECT") {
      return (
        <select value={val} onChange={(e) => onValueChange(a.id, e.target.value)} className={cls}>
          <option value="">—</option>
          {a.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    }
    return (
      <input
        type={a.fieldType === "NUMBER" ? "number" : "text"}
        step={a.fieldType === "NUMBER" ? "any" : undefined}
        value={val}
        onChange={(e) => onValueChange(a.id, e.target.value)}
        placeholder={`${a.name} (optional)`}
        className={cls}
      />
    );
  }

  // Keep the add-modal's field type selector in sync when switching types.
  useEffect(() => {
    if (showAdd && addField.fieldType !== "SELECT") setAddField((f) => ({ ...f, options: "" }));
  }, [addField.fieldType, showAdd]);

  return (
    <div className="border border-dashed border-gray-300 rounded-xl p-3 bg-gray-50/60 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Custom Fields ({sectionAttrs.length})
          {!subcategoryId && <span className="ml-2 normal-case font-normal text-gray-400">— select a subcategory above to add custom info</span>}
        </div>
        <div className="flex gap-2">
          {sectionAttrs.length > 1 && (
            <button
              type="button"
              onClick={() => setShowManage((v) => !v)}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 border border-gray-300 bg-white px-2.5 py-1.5 rounded-lg"
            >
              {showManage ? "Done Managing" : "Manage Fields"}
            </button>
          )}
          <button
            type="button"
            disabled={!subcategoryId}
            onClick={() => setShowAdd(true)}
            className="text-xs font-semibold text-white bg-gray-900 hover:bg-gray-700 disabled:opacity-40 px-2.5 py-1.5 rounded-lg"
          >
            + Add Info
          </button>
        </div>
      </div>

      {subcategoryId && sectionAttrs.length === 0 && !showManage && (
        <p className="text-xs text-gray-400">
          No custom fields for this subcategory yet. Click <strong>+ Add Info</strong> to create one — it will appear for every product in this subcategory.
        </p>
      )}

      {sectionAttrs.length > 0 && (
        <div className="grid md:grid-cols-2 gap-3">
          {sectionAttrs.map((a, i) => (
            <div key={a.id} className="text-sm bg-white border border-gray-200 rounded-lg p-2">
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="text-gray-600 truncate">
                  {a.name}
                  <span className="ml-1.5 text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                    {TYPE_LABELS[a.fieldType]}
                  </span>
                </span>
                <span className="flex gap-0.5 shrink-0">
                  {showManage && (
                    <>
                      <button type="button" title="Move up" disabled={i === 0}
                        onClick={() => move(a, -1)}
                        className="w-6 h-6 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30">↑</button>
                      <button type="button" title="Move down" disabled={i === sectionAttrs.length - 1}
                        onClick={() => move(a, 1)}
                        className="w-6 h-6 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30">↓</button>
                      <button type="button" title="Edit field"
                        onClick={() => openEdit(a)}
                        className="w-6 h-6 rounded border border-gray-200 text-blue-600 hover:bg-blue-50 font-semibold">✎</button>
                      <button type="button" title="Delete field"
                        onClick={() => setDeleteTarget(a)}
                        className="w-6 h-6 rounded border border-gray-200 text-red-600 hover:bg-red-50 font-semibold">🗑</button>
                    </>
                  )}
                  {!showManage && (
                    <button type="button" title="Manage"
                      onClick={() => setShowManage(true)}
                      className="w-6 h-6 rounded border border-gray-200 text-gray-400 hover:bg-gray-100">⋯</button>
                  )}
                </span>
              </div>
              {renderInput(a)}
            </div>
          ))}
        </div>
      )}

      {/* ---- + Add Info modal ---- */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setShowAdd(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-semibold text-gray-900">Add Custom Field</h4>
            <p className="text-xs text-gray-500">
              Created once for this subcategory — it will appear on every product form in it, in the <strong>{section === "HEADER" ? "Main Information" : section === "DESCRIPTION" ? "Product Description" : "Specifications"}</strong> area.
            </p>
            <label className="block text-sm">
              <span className="block text-gray-600 mb-1">Field Name *</span>
              <input
                autoFocus
                value={addField.name}
                onChange={(e) => setAddField((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Smoothness"
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
              />
            </label>
            <label className="block text-sm">
              <span className="block text-gray-600 mb-1">Field Type</span>
              <select
                value={addField.fieldType}
                onChange={(e) => setAddField((f) => ({ ...f, fieldType: e.target.value as AttributeFieldType }))}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
              >
                <option value="TEXT">Text</option>
                <option value="LONG_TEXT">Long Text</option>
                <option value="NUMBER">Number</option>
                <option value="SELECT">Dropdown</option>
              </select>
            </label>
            {addField.fieldType === "SELECT" && (
              <label className="block text-sm">
                <span className="block text-gray-600 mb-1">Dropdown Options (comma-separated) *</span>
                <input
                  value={addField.options}
                  onChange={(e) => setAddField((f) => ({ ...f, options: e.target.value }))}
                  placeholder="e.g. Very Smooth, Medium, Rough"
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                />
              </label>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" disabled={busy} onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-100">
                Cancel
              </button>
              <button type="button" disabled={busy || !addField.name.trim()}
                onClick={createField}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50">
                {busy ? "Creating…" : "Create Field"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Edit field modal ---- */}
      {editId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setEditId(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-semibold text-gray-900">Edit Custom Field</h4>
            <p className="text-xs text-gray-500">
              Renaming keeps every existing product value attached — nothing is lost.
            </p>
            <label className="block text-sm">
              <span className="block text-gray-600 mb-1">Field Name *</span>
              <input
                autoFocus
                value={editField.name}
                onChange={(e) => setEditField((f) => ({ ...f, name: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
              />
            </label>
            <label className="block text-sm">
              <span className="block text-gray-600 mb-1">Field Type</span>
              <select
                value={editField.fieldType}
                onChange={(e) => setEditField((f) => ({ ...f, fieldType: e.target.value as AttributeFieldType }))}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
              >
                <option value="TEXT">Text</option>
                <option value="LONG_TEXT">Long Text</option>
                <option value="NUMBER">Number</option>
                <option value="SELECT">Dropdown</option>
              </select>
            </label>
            {editField.fieldType === "SELECT" && (
              <label className="block text-sm">
                <span className="block text-gray-600 mb-1">Dropdown Options (comma-separated)</span>
                <input
                  value={editField.options}
                  onChange={(e) => setEditField((f) => ({ ...f, options: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                />
              </label>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" disabled={busy} onClick={() => setEditId(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-100">
                Cancel
              </button>
              <button type="button" disabled={busy || !editField.name.trim()}
                onClick={saveEdit}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50">
                {busy ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Delete confirmation modal ---- */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setDeleteTarget(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-semibold text-gray-900 text-red-700">Delete &quot;{deleteTarget.name}&quot;?</h4>
            <p className="text-sm text-gray-600">
              This removes the <strong>{deleteTarget.name}</strong> field from every product form in this subcategory.
              Existing product values are archived and the field disappears from the website — but the product itself is <strong>not</strong> affected.
            </p>
            {deleteTarget.valueCount > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {deleteTarget.valueCount} product{deleteTarget.valueCount === 1 ? "" : "s"} currently{" "}
                {deleteTarget.valueCount === 1 ? "has" : "have"} a value for this field.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" disabled={busy} onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-100">
                Cancel
              </button>
              <button type="button" disabled={busy} onClick={deleteField}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                {busy ? "Deleting…" : "Delete Field"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
