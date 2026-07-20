"use client";

import { useCallback, useEffect, useState } from "react";

interface MasterItem {
  id: number;
  name: string;
  slug?: string;
}

interface CategoryItem extends MasterItem {
  departmentId: number;
  sectionId: number | null;
}

interface ProductItem {
  id: number;
  slug: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  isActive: boolean;
  category: string;
  image: string;
}

type FormField =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[];

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function fetchJson(url: string): Promise<{ items: MasterItem[] }> {
  const r = await fetch(url, { credentials: "same-origin" });
  const d = await r.json();
  return d.data ?? { items: [] };
}

export function ProductsTab() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [departments, setDepartments] = useState<MasterItem[]>([]);
  const [sections, setSections] = useState<MasterItem[]>([]);
  const [subcategories, setSubcategories] = useState<MasterItem[]>([]);
  const [brands, setBrands] = useState<MasterItem[]>([]);
  const [materials, setMaterials] = useState<MasterItem[]>([]);
  const [colors, setColors] = useState<MasterItem[]>([]);
  const [sizes, setSizes] = useState<MasterItem[]>([]);
  const [units, setUnits] = useState<MasterItem[]>([]);
  const [suppliers, setSuppliers] = useState<MasterItem[]>([]);
  const [countries, setCountries] = useState<MasterItem[]>([]);
  const [taxes, setTaxes] = useState<MasterItem[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [f, setF] = useState<Record<string, FormField>>({});
  const [selectedColors, setSelectedColors] = useState<number[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<number[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [primaryImage, setPrimaryImage] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const resetForm = () => {
    setF({
      slug: "", name: "", description: "", longDescription: "",
      price: "0", costPrice: "0", discount: "0",
      stock: "0", minStock: "10",
      image: "", line: "", sku: "", barcode: "", ndNumber: "", internalCode: "",
      specs: "[]",
      applications: "", additionalInfo: "",
      seoTitle: "", seoDescription: "",
      tags: "",
      weight: "", length: "", width: "", height: "", warranty: "",
      categoryId: "", subcategoryId: "",
      brandId: "", materialId: "", supplierId: "", unitId: "", countryId: "", taxId: "",
      departmentId: "",
      isActive: "true", isFeatured: "false", isBestSeller: "false", isNewArrival: "false",
    } as Record<string, string>);
    setSelectedColors([]);
    setSelectedSizes([]);
    setGallery([]);
    setPrimaryImage("");
  };

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    const fd = new FormData();
    for (const file of Array.from(files)) fd.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", credentials: "same-origin", body: fd });
      const data = await res.json();
      if (data.success) {
        const urls = data.data.urls as string[];
        setGallery((prev) => {
          const next = [...prev, ...urls];
          if (!primaryImage && next.length > 0) setPrimaryImage(next[0]);
          return next;
        });
      } else {
        setError(data.error || "Upload failed");
      }
    } catch {
      setError("Upload failed");
    }
    setUploading(false);
  }

  function removeImage(url: string) {
    setGallery((prev) => {
      const next = prev.filter((u) => u !== url);
      if (primaryImage === url) setPrimaryImage(next[0] ?? "");
      return next;
    });
  }

  function moveImage(from: number, to: number) {
    if (to < 0 || to >= gallery.length) return;
    setGallery((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  const loadAll = useCallback(() => {
    fetch("/api/admin/products", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setProducts(d.data.products);
          setCategories(d.data.categories ?? []);
        }
      });
    fetchJson("/api/admin/hierarchy/departments").then((d) => setDepartments(d.items));
    fetchJson("/api/admin/hierarchy/sections").then((d) => setSections(d.items));
    fetchJson("/api/admin/hierarchy/subcategories").then((d) => setSubcategories(d.items));
    fetchJson("/api/admin/master/brands").then((d) => setBrands(d.items));
    fetchJson("/api/admin/master/materials").then((d) => setMaterials(d.items));
    fetchJson("/api/admin/master/colors").then((d) => setColors(d.items));
    fetchJson("/api/admin/master/sizes").then((d) => setSizes(d.items));
    fetchJson("/api/admin/master/units").then((d) => setUnits(d.items));
    fetchJson("/api/admin/master/suppliers").then((d) => setSuppliers(d.items));
    fetchJson("/api/admin/master/countries").then((d) => setCountries(d.items));
    fetchJson("/api/admin/master/taxes").then((d) => setTaxes(d.items));
  }, []);

  useEffect(loadAll, [loadAll]);

  const filtered = products.filter(
    (p) => !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.slug.includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase())
  );

  const filteredCategories = categories.filter((c) => !f.departmentId || c.departmentId === Number(f.departmentId));
  const filteredSubcategories = subcategories.filter((s) => s.slug !== undefined && (s as unknown as { categoryId?: number }).categoryId === Number(f.categoryId));
  // Actually subcategories have categoryId, not departmentId. Let me fix this.
  const subcatsOfCategory = subcategories.filter((s) => (s as unknown as { categoryId?: number }).categoryId === Number(f.categoryId));

  const update = (key: string, value: FormField) => {
    setF((prev) => ({ ...prev, [key]: value }));
    if (key === "name" && !f.slug) setF((prev) => ({ ...prev, slug: slugify(String(value)) }));
  };

  const toggleColor = (id: number) => {
    setSelectedColors((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };
  const toggleSize = (id: number) => {
    setSelectedSizes((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");

    if (!f.slug || !f.name) {
      setError("Slug and Name are required");
      setSaving(false);
      return;
    }

    const num = (v: FormField) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
    const optNum = (v: FormField) => { if (v === "" || v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
    const int = (v: FormField) => Math.floor(num(v));
    const bool = (v: FormField) => v === "true" || v === true;

    const payload: Record<string, unknown> = {
      slug: f.slug,
      name: f.name,
      description: f.description,
      longDescription: f.longDescription,
      price: num(f.price),
      costPrice: num(f.costPrice),
      discount: num(f.discount),
      stock: int(f.stock),
      minStock: int(f.minStock),
      image: primaryImage || gallery[0] || f.image,
      images: gallery,
      line: f.line,
      sku: f.sku,
      barcode: f.barcode,
      ndNumber: f.ndNumber,
      internalCode: f.internalCode,
      specs: f.specs || "[]",
      applications: f.applications,
      additionalInfo: f.additionalInfo,
      seoTitle: f.seoTitle,
      seoDescription: f.seoDescription,
      tags: String(f.tags).split(",").map((t) => t.trim()).filter(Boolean),
      weight: optNum(f.weight),
      length: optNum(f.length),
      width: optNum(f.width),
      height: optNum(f.height),
      warranty: f.warranty,
      isActive: bool(f.isActive),
      isFeatured: bool(f.isFeatured),
      isBestSeller: bool(f.isBestSeller),
      isNewArrival: bool(f.isNewArrival),
      categoryId: Number(f.categoryId) || 0,
      subcategoryId: f.subcategoryId ? Number(f.subcategoryId) : null,
      brandId: f.brandId ? Number(f.brandId) : null,
      materialId: f.materialId ? Number(f.materialId) : null,
      supplierId: f.supplierId ? Number(f.supplierId) : null,
      unitId: f.unitId ? Number(f.unitId) : null,
      countryId: f.countryId ? Number(f.countryId) : null,
      taxId: f.taxId ? Number(f.taxId) : null,
      colorIds: selectedColors,
      sizeIds: selectedSizes,
    };

    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      setMessage("Product created");
      setShowForm(false);
      loadAll();
    } else {
      setError(data.error || "Create failed");
    }
  }

  const renderInput = (key: string, label: string, type = "text", opts?: { span?: boolean; step?: string }) => (
    <label key={key} className={`text-sm ${opts?.span ? "md:col-span-3" : ""}`}>
      <span className="block text-gray-600 mb-1">{label}</span>
      {type === "textarea" ? (
        <textarea value={String(f[key] ?? "")} onChange={(e) => update(key, e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 w-full" rows={3} />
      ) : (
        <input type={type} step={opts?.step} value={String(f[key] ?? "")} onChange={(e) => update(key, e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 w-full" />
      )}
    </label>
  );

  const renderSelect = (key: string, label: string, items: MasterItem[], required?: boolean) => (
    <label key={key} className="text-sm">
      <span className="block text-gray-600 mb-1">{label}{required ? " *" : ""}</span>
      <select value={String(f[key] ?? "")} onChange={(e) => update(key, e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 w-full">
        <option value="">Select…</option>
        {(items ?? []).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
      </select>
    </label>
  );

  const renderBool = (key: string, label: string) => (
    <label key={key} className="text-sm flex items-center gap-2 pt-6">
      <input type="checkbox" checked={f[key] === "true" || f[key] === true} onChange={(e) => update(key, e.target.checked ? "true" : "false")} className="rounded border-gray-300" />
      <span className="text-gray-600">{label}</span>
    </label>
  );

  const renderMultiSelect = (label: string, items: MasterItem[], selected: number[], toggle: (id: number) => void) => (
    <div key={label} className="text-sm">
      <span className="block text-gray-600 mb-1">{label}</span>
      <div className="flex flex-wrap gap-1.5 border border-gray-300 rounded-lg px-3 py-2 min-h-[38px]">
        {(items ?? []).map((i) => (
          <button
            key={i.id}
            type="button"
            onClick={() => toggle(i.id)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border ${selected.includes(i.id) ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"}`}
          >
            {i.name}
          </button>
        ))}
        {items.length === 0 && <span className="text-gray-400 text-xs">No items (create in Master Data first)</span>}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, slug, SKU…" className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64" />
        <button onClick={() => { setShowForm((v) => !v); if (!showForm) resetForm(); }} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          {showForm ? "Close" : "+ New Product"}
        </button>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {message && <p className="text-green-700 text-sm">{message}</p>}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 space-y-4">
          <h3 className="font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
          <div className="grid md:grid-cols-3 gap-3">
            {renderInput("name", "Name *")}
            {renderInput("slug", "Slug *")}
            {renderInput("sku", "SKU")}
            {renderInput("barcode", "Barcode")}
            {renderInput("ndNumber", "ND Number")}
            {renderInput("internalCode", "Internal Item Code")}
            {renderInput("line", "Product Line")}
          </div>

          <h3 className="font-semibold text-gray-900 border-b pb-2">Pricing</h3>
          <div className="grid md:grid-cols-4 gap-3">
            {renderInput("price", "Selling Price (KD)", "number", { step: "0.001" })}
            {renderInput("costPrice", "Cost Price (KD)", "number", { step: "0.001" })}
            {renderInput("discount", "Discount (KD)", "number", { step: "0.001" })}
          </div>

          <h3 className="font-semibold text-gray-900 border-b pb-2">Categories &amp; Relations</h3>
          <div className="grid md:grid-cols-3 gap-3">
            {renderSelect("departmentId", "Department", departments)}
            {renderSelect("categoryId", "Category *", filteredCategories)}
            {renderSelect("subcategoryId", "Subcategory", subcatsOfCategory)}
            {renderSelect("brandId", "Brand", brands)}
            {renderSelect("materialId", "Material", materials)}
            {renderSelect("supplierId", "Supplier", suppliers)}
            {renderSelect("unitId", "Unit", units)}
            {renderSelect("countryId", "Country", countries)}
            {renderSelect("taxId", "Tax", taxes)}
          </div>

          <h3 className="font-semibold text-gray-900 border-b pb-2">Colors &amp; Sizes</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {renderMultiSelect("Colors", colors, selectedColors, toggleColor)}
            {renderMultiSelect("Sizes", sizes, selectedSizes, toggleSize)}
          </div>

          <h3 className="font-semibold text-gray-900 border-b pb-2">Stock &amp; Inventory</h3>
          <div className="grid md:grid-cols-3 gap-3">
            {renderInput("stock", "Stock Quantity", "number")}
            {renderInput("minStock", "Minimum Stock", "number")}
          </div>

          <h3 className="font-semibold text-gray-900 border-b pb-2">Dimensions &amp; Weight</h3>
          <div className="grid md:grid-cols-4 gap-3">
            {renderInput("weight", "Weight (kg)", "number", { step: "0.001" })}
            {renderInput("length", "Length (cm)", "number", { step: "0.1" })}
            {renderInput("width", "Width (cm)", "number", { step: "0.1" })}
            {renderInput("height", "Height (cm)", "number", { step: "0.1" })}
            {renderInput("warranty", "Warranty")}
          </div>

          <h3 className="font-semibold text-gray-900 border-b pb-2">Descriptions</h3>
          <div className="grid md:grid-cols-1 gap-3">
            {renderInput("description", "Short Description", "textarea", { span: true })}
            {renderInput("longDescription", "Long Description", "textarea", { span: true })}
            {renderInput("specs", "Specifications (JSON)", "textarea", { span: true })}
            {renderInput("applications", "Applications", "textarea", { span: true })}
            {renderInput("additionalInfo", "Additional Information", "textarea", { span: true })}
          </div>

          <h3 className="font-semibold text-gray-900 border-b pb-2">Media Library</h3>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"}`}
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            <input id="file-upload" type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            {uploading ? (
              <p className="text-gray-600 text-sm">Uploading…</p>
            ) : (
              <div className="space-y-1">
                <p className="text-gray-600 text-sm font-medium">Drag &amp; drop images here, or click to browse</p>
                <p className="text-gray-400 text-xs">JPG, PNG, WebP, GIF up to 8MB</p>
              </div>
            )}
          </div>
          {gallery.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {gallery.map((url, idx) => (
                <div key={url} className={`relative group rounded-lg overflow-hidden border-2 ${primaryImage === url ? "border-blue-500" : "border-gray-200"}`}>
                  <img src={url} alt="" className="w-full h-24 object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                    <button type="button" onClick={() => setPrimaryImage(url)} className="bg-white text-xs px-2 py-1 rounded font-semibold" title="Set as primary">★</button>
                    <button type="button" onClick={() => moveImage(idx, idx - 1)} className="bg-white text-xs px-2 py-1 rounded font-semibold" title="Move left">←</button>
                    <button type="button" onClick={() => moveImage(idx, idx + 1)} className="bg-white text-xs px-2 py-1 rounded font-semibold" title="Move right">→</button>
                    <button type="button" onClick={() => removeImage(url)} className="bg-red-500 text-white text-xs px-2 py-1 rounded font-semibold" title="Delete">✕</button>
                  </div>
                  {primaryImage === url && <span className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded">Primary</span>}
                </div>
              ))}
            </div>
          )}

          <h3 className="font-semibold text-gray-900 border-b pb-2">SEO</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {renderInput("seoTitle", "SEO Title")}
            {renderInput("seoDescription", "SEO Description")}
            {renderInput("tags", "Tags (comma-separated)")}
          </div>

          <h3 className="font-semibold text-gray-900 border-b pb-2">Status &amp; Visibility</h3>
          <div className="grid md:grid-cols-4 gap-3">
            {renderBool("isActive", "Active")}
            {renderBool("isFeatured", "Featured")}
            {renderBool("isBestSeller", "Best Seller")}
            {renderBool("isNewArrival", "New Arrival")}
          </div>

          <div className="pt-2">
            <button
              onClick={save}
              disabled={saving}
              className="bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Saving…" : "Create Product"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Price (KD)</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2">
                  <div className="font-medium text-gray-900">{p.name}</div>
                  <div className="text-xs text-gray-500 font-mono">{p.slug}</div>
                </td>
                <td className="px-4 py-2 text-gray-600 font-mono text-xs">{p.sku || "—"}</td>
                <td className="px-4 py-2">{Number(p.price).toFixed(3)}</td>
                <td className="px-4 py-2">
                  <span className={`font-semibold ${p.stock <= 10 ? "text-amber-600" : "text-gray-900"}`}>{p.stock}</span>
                </td>
                <td className="px-4 py-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${p.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}>
                    {p.isActive ? "Active" : "Hidden"}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No products match</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
