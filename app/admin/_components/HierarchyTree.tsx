"use client";

import { useEffect, useState } from "react";

/**
 * Read-only Department → Category → Subcategory overview of the catalog
 * taxonomy. The per-entity tabs next to this one own the CRUD; this view
 * exists so the enforced hierarchy is visible at a glance (the same category
 * name may legitimately appear under multiple departments — e.g. Trolleys &
 * Baskets under both Supermarket and Warehouse — so parent context matters).
 */

interface HierarchyRow {
  id: number;
  slug: string;
  name: string;
  department?: { id: number; name: string } | null;
  category?: { id: number; name: string } | null;
}

interface TreeNode {
  dept: HierarchyRow;
  categories: Array<{ cat: HierarchyRow; subs: HierarchyRow[] }>;
}

export function HierarchyTree() {
  const [tree, setTree] = useState<TreeNode[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      (["departments", "categories", "subcategories"] as const).map((e) =>
        fetch(`/api/admin/hierarchy/${e}`, { credentials: "same-origin" })
          .then((r) => r.json())
          .then((d) => (d.success ? (d.data.items as HierarchyRow[]) : Promise.reject(new Error(d.error || `Failed to load ${e}`))))
      )
    )
      .then(([departments, categories, subcategories]) => {
        if (cancelled) return;
        const nodes: TreeNode[] = departments.map((dept) => ({
          dept,
          categories: categories
            .filter((c) => c.department?.id === dept.id)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((cat) => ({
              cat,
              subs: subcategories
                .filter((s) => s.category?.id === cat.id)
                .sort((a, b) => a.name.localeCompare(b.name)),
            })),
        }));
        setTree(nodes);
      })
      .catch((e) => { if (!cancelled) setError(e.message || "Failed to load hierarchy"); });
    return () => { cancelled = true; };
  }, []);

  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!tree) return <p className="text-gray-500 text-sm">Loading hierarchy…</p>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-6">
      {tree.length === 0 && <p className="text-gray-500 text-sm">No departments yet.</p>}
      {tree.map(({ dept, categories }) => (
        <section key={dept.id}>
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-700">
            {dept.name}
            <span className="ml-2 font-mono text-xs font-normal text-gray-400">{dept.slug}</span>
          </h3>
          {categories.length === 0 ? (
            <p className="text-xs text-gray-400 mt-2 ml-1">No categories.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {categories.map(({ cat, subs }) => (
                <li key={cat.id} className="border-l-2 border-gray-200 pl-3">
                  <span className="text-sm font-semibold text-gray-800">{cat.name}</span>
                  <span className="ml-2 font-mono text-xs text-gray-400">{cat.slug}</span>
                  {subs.length > 0 ? (
                    <ul className="mt-1 space-y-0.5">
                      {subs.map((s) => (
                        <li key={s.id} className="text-sm text-gray-600 flex items-baseline gap-2">
                          <span className="text-gray-300 select-none">└</span>
                          <span>{s.name}</span>
                          <span className="font-mono text-xs text-gray-400">{s.slug}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5">No subcategories.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
