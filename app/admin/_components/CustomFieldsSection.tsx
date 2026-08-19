"use client";

import { useEffect, useState } from "react";

export type AttributeSectionName = "HEADER" | "DESCRIPTION" | "SPECIFICATIONS";
export type AttributeFieldType = "TEXT" | "LONG_TEXT" | "NUMBER" | "SELECT";

export interface CustomAttributeItem {
  id: number;
  name: string;
  nameAr: string;
  section: AttributeSectionName;
  fieldType: AttributeFieldType;
  options: string[];
  /** EN option → Arabic label ("" = not translated). */
  optionsAr: Record<string, string>;
  /** SELECT attributes only — multi-checkbox input, comma-joined storage. */
  multiSelect: boolean;
  displayOrder: number;
  valueCount: number;
}

/** Bilingual per-product value (EN in `value`, AR companion in `valueAr`). */
export interface CustomFieldValue {
  value: string;
  valueAr: string;
}

/** UI field-type choice — YESNO is a Dropdown preset with Yes/No options. */
type UiFieldType = AttributeFieldType | "YESNO";

interface CustomFieldsSectionProps {
  section: AttributeSectionName;
  subcategoryId: string;
  attributes: CustomAttributeItem[];
  values: Record<number, CustomFieldValue>;
  onValueChange: (id: number, patch: Partial<CustomFieldValue>) => void;
  onRefresh: () => void;
  onError: (msg: string) => void;
}

const TYPE_LABELS: Record<UiFieldType, string> = {
  TEXT: "Text",
  LONG_TEXT: "Long Text",
  NUMBER: "Number",
  SELECT: "Dropdown",
  YESNO: "Yes / No",
};

interface OptionRow {
  en: string;
  ar: string;
}

const emptyDraft = () => ({
  name: "",
  nameAr: "",
  fieldType: "TEXT" as UiFieldType,
  multiSelect: false,
  options: [] as OptionRow[],
});

/**
 * Dynamic per-subcategory custom fields for one information area
 * (Header / Description / Specifications).
 *
 * "+ Add Info" defines a field ONCE for the subcategory — bilingual name
 * (English + Arabic), input type (Text / Long Text / Number / Dropdown /
 * Yes-No / multi-select Dropdown), and per-option Arabic labels. It then
 * appears for every product in that subcategory with paired EN/AR value
 * inputs (Number is language-neutral). Fields are always optional — empty
 * values never block saving.
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
  const [draft, setDraft] = useState(emptyDraft());
  const [busy, setBusy] = useState(false);

  const [editId, setEditId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState(emptyDraft());

  const [deleteTarget, setDeleteTarget] = useState<CustomAttributeItem | null>(null);
  const [showManage, setShowManage] = useState(false);

  const sectionAttrs = attributes
    .filter((a) => a.section === section)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);

  function draftToPayload(d: typeof draft) {
    const isYesNo = d.fieldType === "YESNO";
    const options = isYesNo ? [{ en: "Yes", ar: "" }, { en: "No", ar: "" }] : d.options.filter((o) => o.en.trim());
    return {
      name: d.name,
      nameAr: d.nameAr,
      fieldType: isYesNo ? ("SELECT" as const) : d.fieldType,
      options: d.fieldType === "TEXT" || d.fieldType === "LONG_TEXT" || d.fieldType === "NUMBER" ? [] : options,
      multiSelect: !isYesNo && d.fieldType === "SELECT" && d.multiSelect,
    };
  }

  async function createField() {
    if (!subcategoryId) return;
    setBusy(true);
    try {
      const payload = draftToPayload(draft);
      const res = await fetch("/api/admin/attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ subcategoryId: Number(subcategoryId), section, ...payload }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAdd(false);
        setDraft(emptyDraft());
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
      const payload = draftToPayload(editDraft);
      const res = await fetch("/api/admin/attributes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ id: editId, ...payload }),
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

  function isYesNo(a: CustomAttributeItem) {
    return a.fieldType === "SELECT" && !a.multiSelect && a.options.length === 2 && a.options[0] === "Yes" && a.options[1] === "No";
  }

  function openEdit(a: CustomAttributeItem) {
    setEditId(a.id);
    setEditDraft({
      name: a.name,
      nameAr: a.nameAr,
      fieldType: isYesNo(a) ? "YESNO" : a.fieldType,
      multiSelect: a.multiSelect,
      options: a.options.map((o) => ({ en: o, ar: a.optionsAr?.[o] ?? "" })),
    });
  }

  /** Product-value input(s) for one attribute, bilingual where meaningful. */
  function renderInput(a: CustomAttributeItem) {
    const v = values[a.id] ?? { value: "", valueAr: "" };
    const cls = "border border-gray-300 rounded-lg px-3 py-2 w-full";
    const arCls = "border border-gray-300 rounded-lg px-3 py-2 w-full text-right" ;

    const arInput = (
      <input
        dir="rtl"
        value={v.valueAr}
        onChange={(e) => onValueChange(a.id, { valueAr: e.target.value })}
        placeholder={`عربي — ${a.nameAr || a.name}`}
        className={arCls}
      />
    );

    if (a.fieldType === "SELECT" && a.multiSelect) {
      const chosen = v.value.split(",").map((s) => s.trim()).filter(Boolean);
      const toggle = (opt: string) => {
        const next = chosen.includes(opt) ? chosen.filter((c) => c !== opt) : [...chosen, opt];
        // Keep the option order defined by the admin.
        const ordered = a.options.filter((o) => next.includes(o));
        const orderedAr = ordered.map((o) => a.optionsAr?.[o] || o);
        onValueChange(a.id, { value: ordered.join(", "), valueAr: orderedAr.join(", ") });
      };
      return (
        <div className="flex flex-wrap gap-2">
          {a.options.map((o) => (
            <label key={o} className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={chosen.includes(o)} onChange={() => toggle(o)} />
              <span>{a.optionsAr?.[o] ? <>{a.optionsAr[o]} <span className="text-gray-400 text-xs">({o})</span></> : o}</span>
            </label>
          ))}
        </div>
      );
    }

    if (a.fieldType === "SELECT") {
      return (
        <div className="space-y-1.5">
          <select value={v.value} onChange={(e) => onValueChange(a.id, { value: e.target.value })} className={cls}>
            <option value="">—</option>
            {a.options.map((o) => (
              <option key={o} value={o}>{a.optionsAr?.[o] ? `${a.optionsAr[o]} (${o})` : o}</option>
            ))}
          </select>
          <p className="text-[11px] text-gray-400">Arabic option labels are defined with the field (Manage Fields).</p>
        </div>
      );
    }

    if (a.fieldType === "NUMBER") {
      return (
        <input
          type="number"
          step="any"
          value={v.value}
          onChange={(e) => onValueChange(a.id, { value: e.target.value })}
          placeholder={`${a.name} (optional)`}
          className={cls}
        />
      );
    }

    if (a.fieldType === "LONG_TEXT") {
      return (
        <div className="space-y-1.5">
          <textarea
            value={v.value}
            rows={2}
            onChange={(e) => onValueChange(a.id, { value: e.target.value })}
            placeholder={`${a.name} — English`}
            className={cls}
          />
          <textarea
            dir="rtl"
            value={v.valueAr}
            rows={2}
            onChange={(e) => onValueChange(a.id, { valueAr: e.target.value })}
            placeholder={`${a.nameAr || a.name} — عربي`}
            className={arCls}
          />
        </div>
      );
    }

    return (
      <div className="space-y-1.5">
        <input
          value={v.value}
          onChange={(e) => onValueChange(a.id, { value: e.target.value })}
          placeholder={`${a.name} — English`}
          className={cls}
        />
        {arInput}
      </div>
    );
  }

  function renderDraftEditor(
    d: typeof draft,
    set: (updater: (prev: typeof draft) => typeof draft) => void
  ) {
    const showOptions = d.fieldType === "SELECT";
    return (
      <>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="block text-gray-600 mb-1">Field Name — English *</span>
            <input
              autoFocus
              value={d.name}
              onChange={(e) => set((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Cooling Temperature"
              className="border border-gray-300 rounded-lg px-3 py-2 w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="block text-gray-600 mb-1">اسم الحقل — عربي</span>
            <input
              dir="rtl"
              value={d.nameAr}
              onChange={(e) => set((p) => ({ ...p, nameAr: e.target.value }))}
              placeholder="مثال: درجة حرارة التبريد"
              className="border border-gray-300 rounded-lg px-3 py-2 w-full text-right"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="block text-gray-600 mb-1">Field Type</span>
          <select
            value={d.fieldType}
            onChange={(e) => set((p) => ({ ...p, fieldType: e.target.value as UiFieldType }))}
            className="border border-gray-300 rounded-lg px-3 py-2 w-full"
          >
            <option value="TEXT">Text (English + Arabic)</option>
            <option value="LONG_TEXT">Long Text (English + Arabic)</option>
            <option value="NUMBER">Number</option>
            <option value="SELECT">Dropdown</option>
            <option value="YESNO">Yes / No</option>
          </select>
        </label>
        {showOptions && (
          <>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={d.multiSelect}
                onChange={(e) => set((p) => ({ ...p, multiSelect: e.target.checked }))}
              />
              Allow selecting multiple options
            </label>
            <div className="space-y-2">
              <span className="block text-sm text-gray-600">Dropdown Options (English + Arabic)</span>
              {d.options.length === 0 && (
                <p className="text-xs text-gray-400">No options yet — add at least one.</p>
              )}
              {d.options.map((o, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={o.en}
                    onChange={(e) =>
                      set((p) => ({ ...p, options: p.options.map((x, j) => (j === i ? { ...x, en: e.target.value } : x)) }))
                    }
                    placeholder="English option"
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                  />
                  <input
                    dir="rtl"
                    value={o.ar}
                    onChange={(e) =>
                      set((p) => ({ ...p, options: p.options.map((x, j) => (j === i ? { ...x, ar: e.target.value } : x)) }))
                    }
                    placeholder="الخيار بالعربية"
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-right"
                  />
                  <button
                    type="button"
                    title="Remove option"
                    onClick={() => set((p) => ({ ...p, options: p.options.filter((_, j) => j !== i) }))}
                    className="w-8 h-9 shrink-0 rounded-lg border border-gray-200 text-red-600 hover:bg-red-50"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => set((p) => ({ ...p, options: [...p.options, { en: "", ar: "" }] }))}
                className="text-xs font-semibold text-gray-700 border border-gray-300 bg-white px-2.5 py-1.5 rounded-lg hover:bg-gray-100"
              >
                + Add Option
              </button>
            </div>
          </>
        )}
      </>
    );
  }

  useEffect(() => {
    if (showAdd && draft.fieldType !== "SELECT") setDraft((f) => ({ ...f, options: [] }));
  }, [draft.fieldType, showAdd]);

  const sectionLabel = section === "HEADER" ? "Main Information" : section === "DESCRIPTION" ? "Product Description" : "Specifications";

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
                  {a.nameAr && <span className="ml-1.5 text-gray-400" dir="rtl">· {a.nameAr}</span>}
                  <span className="ml-1.5 text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                    {TYPE_LABELS[isYesNo(a) ? "YESNO" : a.fieldType]}{a.multiSelect ? " (multi)" : ""}
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-5 space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-semibold text-gray-900">Add Custom Field</h4>
            <p className="text-xs text-gray-500">
              Created once for this subcategory — it will appear on every product form in it, in the <strong>{sectionLabel}</strong> area, with English and Arabic inputs.
            </p>
            {renderDraftEditor(draft, setDraft)}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" disabled={busy} onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-100">
                Cancel
              </button>
              <button type="button" disabled={busy || !draft.name.trim() || (draft.fieldType === "SELECT" && draft.options.filter((o) => o.en.trim()).length === 0)}
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-5 space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-semibold text-gray-900">Edit Custom Field</h4>
            <p className="text-xs text-gray-500">
              Renaming keeps every existing product value attached — nothing is lost.
            </p>
            {renderDraftEditor(editDraft, setEditDraft)}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" disabled={busy} onClick={() => setEditId(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-100">
                Cancel
              </button>
              <button type="button" disabled={busy || !editDraft.name.trim()}
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
