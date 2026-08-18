"use client";

import { RANGE_OPTIONS, type RangeSelection } from "./shared";

/**
 * The ONE reusable date-range control. Its selection drives every
 * range-dependent section (sales chart, order analytics, top products,
 * category performance) — components never pick their own range.
 */
export default function DateRangeFilter({
  value,
  onChange,
}: {
  value: RangeSelection;
  onChange: (r: RangeSelection) => void;
}) {
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-widest text-gray-500 mr-1">Sales Period</span>
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange({ ...value, key: opt.key })}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            value.key === opt.key
              ? "bg-slate-900 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
      {value.key === "custom" && (
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1">
          <input
            type="date"
            value={value.from || todayStr}
            max={value.to || todayStr}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="text-xs text-gray-700 outline-none"
            aria-label="From date"
          />
          <span className="text-gray-400 text-xs">→</span>
          <input
            type="date"
            value={value.to || todayStr}
            min={value.from || undefined}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="text-xs text-gray-700 outline-none"
            aria-label="To date"
          />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1">
            {(value.from || todayStr) === (value.to || todayStr) ? "1 day" : ""}
          </span>
        </div>
      )}
    </div>
  );
}
