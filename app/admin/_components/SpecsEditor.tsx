"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Visual specification editor — replaces the raw "Specifications (JSON)"
 * textarea. Administrators edit simple Label / Value / Note rows; the value
 * round-trips as the SAME JSON string format the API already stores and the
 * storefront product page renders: [{"label":"Capacity","value":"500 L","note":"…"}].
 *
 * Robustness: if the stored JSON is not an array of row-like objects (never
 * the case in current data), the existing content is preserved verbatim and
 * shown read-only — it is never silently dropped or rewritten.
 */

export interface SpecRow {
  label: string;
  value: string;
  note: string;
}

interface EditorRow extends SpecRow {
  uid: number;
}

let uidCounter = 1;
const nextUid = () => uidCounter++;

function toText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  return String(v);
}

/** Parse the stored JSON string into editable rows + any unrecognizable remainder. */
function parseSpecs(raw: string): { rows: EditorRow[]; unrecognized: string | null } {
  const text = (raw ?? "").trim();
  if (!text || text === "[]") return { rows: [], unrecognized: null };
  try {
    const parsed: unknown = JSON.parse(text);
    if (Array.isArray(parsed)) {
      const rows: EditorRow[] = [];
      const foreign: unknown[] = [];
      for (const entry of parsed) {
        if (entry !== null && typeof entry === "object" && !Array.isArray(entry)) {
          const o = entry as Record<string, unknown>;
          // Accept the stored shape (label/value/note) tolerantly: any object
          // carrying at least one of the three fields becomes a row; extra
          // properties are kept in the row's note? No — extra props would be
          // lost. Rows with unknown extra keys go to `foreign` verbatim.
          const keys = Object.keys(o);
          const known = keys.filter((k) => k === "label" || k === "value" || k === "note");
          if (known.length > 0 && known.length === keys.length) {
            rows.push({ uid: nextUid(), label: toText(o.label), value: toText(o.value), note: toText(o.note) });
            continue;
          }
        }
        foreign.push(entry);
      }
      return {
        rows,
        unrecognized: foreign.length ? JSON.stringify(foreign) : null,
      };
    }
    return { rows: [], unrecognized: text };
  } catch {
    return { rows: [], unrecognized: text };
  }
}

interface SpecsEditorProps {
  value: string;
  onChange: (nextJson: string) => void;
}

export function SpecsEditor({ value, onChange }: SpecsEditorProps) {
  const parsed = useMemo(() => parseSpecs(value), [value]);
  const [rows, setRows] = useState<EditorRow[]>(parsed.rows);
  const [syncedValue, setSyncedValue] = useState(value);

  // Re-sync local rows when the parent loads a DIFFERENT product's specs
  // (edit form switch), but not on our own emitted changes.
  useEffect(() => {
    if (value !== syncedValue) {
      setRows(parseSpecs(value).rows);
      setSyncedValue(value);
    }
  }, [value, syncedValue]);

  function emit(nextRows: EditorRow[]) {
    setRows(nextRows);
    const kept = nextRows
      .filter((r) => r.label.trim() !== "" || r.value.trim() !== "")
      .map((r) => ({
        label: r.label.trim(),
        value: r.value.trim(),
        note: r.note.trim(),
      }));
    // Unrecognized stored content is preserved at its original position
    // (leading) so the storefront rendering order stays identical.
    const out = parsed.unrecognized
      ? JSON.stringify([...JSON.parse(parsed.unrecognized), ...kept])
      : JSON.stringify(kept);
    setSyncedValue(out);
    onChange(out);
  }

  const setField = (uid: number, field: keyof SpecRow, text: string) =>
    emit(rows.map((r) => (r.uid === uid ? { ...r, [field]: text } : r)));

  const addRow = () =>
    emit([...rows, { uid: nextUid(), label: "", value: "", note: "" }]);

  const removeRow = (uid: number) => emit(rows.filter((r) => r.uid !== uid));

  const move = (uid: number, dir: -1 | 1) => {
    const idx = rows.findIndex((r) => r.uid === uid);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= rows.length) return;
    const next = [...rows];
    const [row] = next.splice(idx, 1);
    next.splice(target, 0, row);
    emit(next);
  };

  return (
    <div className="border border-gray-200 rounded-xl p-3 space-y-3 bg-white">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Specifications</div>
        <button
          type="button"
          onClick={addRow}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-2.5 py-1 hover:bg-blue-50"
        >
          + Add Specification
        </button>
      </div>

      {parsed.unrecognized !== null && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2">
          This product has specification data in an unrecognized format. It will be preserved exactly as-is (shown below) — new rows you add are appended after it.
          <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-amber-900 select-all">{parsed.unrecognized}</pre>
        </div>
      )}

      {rows.length === 0 && parsed.unrecognized === null && (
        <p className="text-sm text-gray-500 py-2">
          No specifications yet. Add rows such as <span className="font-medium">Capacity — 500 L</span>; they appear as the spec table on the product page.
        </p>
      )}

      {rows.length > 0 && (
        <div>
          <div className="hidden md:grid md:grid-cols-[1fr_1fr_1.4fr_auto] gap-2 px-1 pb-1 text-xs font-semibold text-gray-500">
            <span>Label</span>
            <span>Value</span>
            <span>Note (optional)</span>
            <span className="w-[64px] text-center">Order</span>
          </div>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={r.uid} className="grid md:grid-cols-[1fr_1fr_1.4fr_auto] gap-2 items-center">
                <input
                  value={r.label}
                  onChange={(e) => setField(r.uid, "label", e.target.value)}
                  placeholder="e.g. Capacity"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
                />
                <input
                  value={r.value}
                  onChange={(e) => setField(r.uid, "value", e.target.value)}
                  placeholder="e.g. 500 L"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
                />
                <input
                  value={r.note}
                  onChange={(e) => setField(r.uid, "note", e.target.value)}
                  placeholder="e.g. Spacious interior"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
                />
                <div className="flex items-center gap-1 justify-center w-[64px]">
                  <button type="button" onClick={() => move(r.uid, -1)} disabled={i === 0} title="Move up"
                    className="text-xs px-1.5 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => move(r.uid, 1)} disabled={i === rows.length - 1} title="Move down"
                    className="text-xs px-1.5 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30">↓</button>
                  <button type="button" onClick={() => removeRow(r.uid)} title="Remove"
                    className="text-xs px-1.5 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
