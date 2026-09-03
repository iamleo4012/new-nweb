"use client";

import { useEffect, useState } from "react";
import { MasterDataPanel } from "@/app/admin/_components/MasterDataPanel";

const SIMPLE_ENTITIES = [
  { key: "brands", label: "Brands" },
  { key: "materials", label: "Materials" },
  { key: "colors", label: "Colors" },
  { key: "sizes", label: "Sizes" },
  { key: "units", label: "Units" },
  { key: "suppliers", label: "Suppliers" },
  { key: "countries", label: "Countries" },
] as const;

const HIERARCHY_ENTITIES = [
  { key: "departments", label: "Departments" },
  { key: "sections", label: "Sections" },
  { key: "categories", label: "Categories" },
  { key: "subcategories", label: "Subcategories" },
] as const;

type SimpleKey = (typeof SIMPLE_ENTITIES)[number]["key"];
type HierKey = (typeof HIERARCHY_ENTITIES)[number]["key"];
type EntityKey = SimpleKey | HierKey;

export function MasterDataTab() {
  const [active, setActive] = useState<EntityKey>("departments");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {HIERARCHY_ENTITIES.map((e) => (
          <button
            key={e.key}
            onClick={() => setActive(e.key)}
            className={`px-3 py-1.5 rounded-md text-sm ${active === e.key ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"}`}
          >
            {e.label}
          </button>
        ))}
        <span className="px-2 text-gray-400 self-center">·</span>
        {SIMPLE_ENTITIES.map((e) => (
          <button
            key={e.key}
            onClick={() => setActive(e.key)}
            className={`px-3 py-1.5 rounded-md text-sm ${active === e.key ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"}`}
          >
            {e.label}
          </button>
        ))}
      </div>
      <MasterDataPanel entity={active} />
    </div>
  );
}
