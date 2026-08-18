"use client";

import { useMemo, useState } from "react";

export interface RelatedCandidate {
  id: number;
  name: string;
  slug: string;
  sku: string;
  image: string;
}

interface RelatedProductsPickerProps {
  /** All existing products to search within. */
  products: RelatedCandidate[];
  /** Selected related product ids, in display order. */
  selected: number[];
  onChange: (ids: number[]) => void;
  /** The product being edited — never offered as a candidate. */
  selfId?: number | null;
}

/**
 * Admin-side Related Products selector: search existing products, select
 * multiple, reorder, remove. Manual selections take priority on the
 * storefront; when none are selected the website falls back to same-section
 * products (existing behaviour, unchanged).
 */
export function RelatedProductsPicker({ products, selected, onChange, selfId }: RelatedProductsPickerProps) {
  const [query, setQuery] = useState("");

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => p.id !== selfId && !selected.includes(p.id))
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [products, query, selected, selfId]);

  function add(id: number) {
    onChange([...selected, id]);
    setQuery("");
  }

  function remove(id: number) {
    onChange(selected.filter((sid) => sid !== id));
  }

  function move(id: number, dir: -1 | 1) {
    const idx = selected.indexOf(id);
    const swapWith = idx + dir;
    if (idx < 0 || swapWith < 0 || swapWith >= selected.length) return;
    const next = [...selected];
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-500">
        Manually chosen related products are shown first on the product page. If none are selected, the website
        automatically shows products from the same section (existing behaviour).
      </div>

      {/* Search + results */}
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products by name, SKU or slug…"
          className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm"
        />
        {query.trim() !== "" && results.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => add(p.id)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left"
              >
                {p.image ? (
                  <img src={p.image} alt="" className="w-8 h-8 object-cover rounded border border-gray-200" />
                ) : (
                  <span className="w-8 h-8 rounded bg-gray-100 inline-block" />
                )}
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-gray-900 truncate">{p.name}</span>
                  <span className="block text-xs text-gray-400 font-mono truncate">{p.sku || p.slug}</span>
                </span>
                <span className="text-xs font-semibold text-green-700">+ Add</span>
              </button>
            ))}
          </div>
        )}
        {query.trim() !== "" && results.length === 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl px-3 py-3 text-sm text-gray-400">
            No matching products
          </div>
        )}
      </div>

      {/* Selected, ordered */}
      {selected.length === 0 ? (
        <p className="text-xs text-gray-400">No related products selected — automatic fallback applies.</p>
      ) : (
        <ul className="space-y-1.5">
          {selected.map((id, i) => {
            const p = byId.get(id);
            return (
              <li key={id} className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2 bg-white">
                {p?.image ? (
                  <img src={p.image} alt="" className="w-8 h-8 object-cover rounded border border-gray-200" />
                ) : (
                  <span className="w-8 h-8 rounded bg-gray-100 inline-block" />
                )}
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-gray-900 truncate">{p?.name ?? `#${id}`}</span>
                  <span className="block text-xs text-gray-400 font-mono truncate">{p?.sku || p?.slug || ""}</span>
                </span>
                <span className="flex gap-1 shrink-0">
                  <button type="button" title="Move up" disabled={i === 0}
                    onClick={() => move(id, -1)}
                    className="w-6 h-6 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30">↑</button>
                  <button type="button" title="Move down" disabled={i === selected.length - 1}
                    onClick={() => move(id, 1)}
                    className="w-6 h-6 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30">↓</button>
                  <button type="button" title="Remove"
                    onClick={() => remove(id)}
                    className="w-6 h-6 rounded border border-gray-200 text-red-600 hover:bg-red-50 font-semibold">✕</button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
