"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  REPORT_COLUMNS,
  REPORT_COLUMNS_BY_GROUP,
  ALL_REPORT_COLUMN_KEYS,
} from "@/lib/report-columns";

/**
 * Configuration dialog for the admin Product Report (Print / Export PDF).
 * Mirrors the existing admin modal pattern (ConfirmDialog / product form):
 * fixed overlay + white panel, Tailwind admin utilities only.
 *
 * Confirming opens /admin/print-report in a NEW tab with the full
 * configuration in the query string; the admin page keeps its state.
 */

export interface ReportCategories {
  id: number;
  name: string;
}

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  categories: ReportCategories[];
  onOpened: (message: string) => void;
}

export function ReportDialog({ open, onClose, categories, onOpened }: ReportDialogProps) {
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [imageSize, setImageSize] = useState<"small" | "medium" | "large" | "xlarge">("medium");
  const [visibility, setVisibility] = useState<"all" | "displayed">("all");
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [idFrom, setIdFrom] = useState("");
  const [idTo, setIdTo] = useState("");
  // "all" = export every column; "select" = use the chosen subset.
  const [columnsMode, setColumnsMode] = useState<"all" | "select">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set(ALL_REPORT_COLUMN_KEYS));

  // Refs for group checkboxes so we can drive the indeterminate state.
  const groupRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Reset the configuration each time the dialog is opened.
  useEffect(() => {
    if (open) {
      setOrientation("landscape");
      setImageSize("medium");
      setVisibility("all");
      setQuery("");
      setCategoryId("");
      setIdFrom("");
      setIdTo("");
      setColumnsMode("all");
      setSelected(new Set(ALL_REPORT_COLUMN_KEYS));
    }
  }, [open]);

  const selectCount = selected.size;

  const groupState = useMemo(() => {
    return REPORT_COLUMNS_BY_GROUP.map(({ group, columns }) => {
      const n = columns.filter((c) => selected.has(c.key)).length;
      return { group, total: columns.length, selected: n };
    });
  }, [selected]);

  // Keep native indeterminate in sync (React can't set it declaratively).
  useEffect(() => {
    for (const { group, selected: n, total } of groupState) {
      const el = groupRefs.current[group];
      if (el) {
        el.checked = n === total;
        el.indeterminate = n > 0 && n < total;
      }
    }
  }, [groupState, open]);

  if (!open) return null;

  const toggleColumn = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleGroup = (group: string, checked: boolean) => {
    const groupKeys = REPORT_COLUMNS_BY_GROUP.find((g) => g.group === group)?.columns.map((c) => c.key) ?? [];
    setSelected((prev) => {
      const next = new Set(prev);
      for (const k of groupKeys) {
        if (checked) next.add(k);
        else next.delete(k);
      }
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(ALL_REPORT_COLUMN_KEYS));
  const deselectAll = () => setSelected(new Set());

  const exportDisabled = columnsMode === "select" && selectCount === 0;

  const confirm = () => {
    if (exportDisabled) return;
    const params = new URLSearchParams();
    params.set("orientation", orientation);
    params.set("imageSize", imageSize);
    params.set("visibility", visibility);
    params.set("colsMode", columnsMode);
    if (columnsMode === "select") params.set("cols", [...selected].join(","));
    if (query.trim()) params.set("q", query.trim());
    if (categoryId) params.set("categoryId", categoryId);
    if (idFrom.trim()) params.set("idFrom", idFrom.trim());
    if (idTo.trim()) params.set("idTo", idTo.trim());
    window.open(`/admin/print-report?${params.toString()}`, "_blank");
    onOpened("Report opened in a new tab — use your browser's Print dialog to save it as a PDF.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Print Report / Export PDF">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-5 pt-5 pb-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Print Report / Export PDF</h3>
          <p className="text-sm text-gray-500 mt-1">
            Configure the product report, then it opens in a new tab ready to print or save as PDF. Nothing is changed in the product database.
          </p>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* Page orientation */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-700 mb-1">Page orientation</legend>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" name="report-orientation" checked={orientation === "landscape"} onChange={() => setOrientation("landscape")} className="border-gray-300" />
                <span className="text-gray-600">Landscape — A4 horizontal</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="report-orientation" checked={orientation === "portrait"} onChange={() => setOrientation("portrait")} className="border-gray-300" />
                <span className="text-gray-600">Portrait — A4 vertical</span>
              </label>
            </div>
          </fieldset>

          {/* Product image size */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-700 mb-1">Image size</legend>
            <div className="flex gap-4 text-sm">
              {([
                ["small", "Small"],
                ["medium", "Medium"],
                ["large", "Large"],
                ["xlarge", "Extra Large"],
              ] as const).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2">
                  <input type="radio" name="report-image-size" checked={imageSize === value} onChange={() => setImageSize(value)} className="border-gray-300" />
                  <span className="text-gray-600">{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Products to include */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-700 mb-1">Products to include</legend>
            <div className="flex flex-col gap-1 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" name="report-visibility" checked={visibility === "all"} onChange={() => setVisibility("all")} className="border-gray-300" />
                <span className="text-gray-600">All products (displayed + hidden)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="report-visibility" checked={visibility === "displayed"} onChange={() => setVisibility("displayed")} className="border-gray-300" />
                <span className="text-gray-600">Displayed products only (visible on the website)</span>
              </label>
            </div>
          </fieldset>

          {/* Optional filters */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-700 mb-1">Optional filters <span className="font-normal text-gray-400">(leave empty to include everything)</span></legend>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm col-span-2">
                <span className="block text-gray-600 mb-1">Search (name, slug, SKU, barcode, internal code)</span>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. basket" className="border border-gray-300 rounded-lg px-3 py-2 w-full" />
              </label>
              <label className="text-sm">
                <span className="block text-gray-600 mb-1">Category</span>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 w-full bg-white">
                  <option value="">All categories</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <div className="text-sm grid grid-cols-2 gap-3">
                <label>
                  <span className="block text-gray-600 mb-1">Product ID from</span>
                  <input type="number" min="1" value={idFrom} onChange={(e) => setIdFrom(e.target.value)} placeholder="e.g. 1" className="border border-gray-300 rounded-lg px-3 py-2 w-full" />
                </label>
                <label>
                  <span className="block text-gray-600 mb-1">Product ID to</span>
                  <input type="number" min="1" value={idTo} onChange={(e) => setIdTo(e.target.value)} placeholder="e.g. 500" className="border border-gray-300 rounded-lg px-3 py-2 w-full" />
                </label>
              </div>
            </div>
          </fieldset>

          {/* Columns to include */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-700 mb-1">Columns to include</legend>
            <div className="flex flex-col gap-1 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" name="report-cols-mode" checked={columnsMode === "all"} onChange={() => setColumnsMode("all")} className="border-gray-300" />
                <span className="text-gray-600">Export all columns ({REPORT_COLUMNS.length} fields)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="report-cols-mode" checked={columnsMode === "select"} onChange={() => setColumnsMode("select")} className="border-gray-300" />
                <span className="text-gray-600">Select specific columns</span>
              </label>
            </div>

            {columnsMode === "select" && (
              <div className="mt-3 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{selectCount} / {REPORT_COLUMNS.length} fields selected</span>
                  <span className="flex gap-3 text-xs">
                    <button type="button" onClick={selectAll} className="font-semibold text-blue-700 hover:underline">Select all</button>
                    <button type="button" onClick={deselectAll} className="font-semibold text-blue-700 hover:underline">Deselect all</button>
                  </span>
                </div>
                <div className="overflow-y-auto max-h-64 px-3 py-2 space-y-3">
                  {REPORT_COLUMNS_BY_GROUP.map(({ group, columns }) => {
                    const n = columns.filter((c) => selected.has(c.key)).length;
                    return (
                      <div key={group}>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                          <input
                            type="checkbox"
                            ref={(el) => { groupRefs.current[group] = el; }}
                            onChange={(e) => toggleGroup(group, e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span>{group}</span>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${n === columns.length ? "bg-gray-900 text-white" : n > 0 ? "bg-gray-200 text-gray-700" : "bg-gray-100 text-gray-400"}`}>
                            {n} / {columns.length}
                          </span>
                        </label>
                        <div className="grid grid-cols-2 gap-x-4 mt-1 ml-6">
                          {columns.map((c) => (
                            <label key={c.key} className="flex items-center gap-2 text-sm text-gray-600 py-0.5">
                              <input type="checkbox" checked={selected.has(c.key)} onChange={() => toggleColumn(c.key)} className="rounded border-gray-300" />
                              <span>{c.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {columnsMode === "select" && selectCount === 0 && (
              <p className="text-xs text-red-600 mt-2">Select at least one column to export.</p>
            )}
            <p className="text-xs text-gray-400 mt-2">The product image is always included as the first column.</p>
          </fieldset>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={exportDisabled}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gray-800 hover:bg-gray-900 disabled:opacity-50"
          >
            Open report
          </button>
        </div>
      </div>
    </div>
  );
}
