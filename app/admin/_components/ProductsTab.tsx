"use client";

import { useCallback, useEffect, useState } from "react";
import { CustomFieldsSection, type CustomAttributeItem, type CustomFieldValue } from "@/app/admin/_components/CustomFieldsSection";
import { RelatedProductsPicker } from "@/app/admin/_components/RelatedProductsPicker";
import { SpecsEditor } from "@/app/admin/_components/SpecsEditor";
import { ConfirmDialog } from "./ConfirmDialog";

interface MasterItem {
  id: number;
  name: string;
  slug?: string;
  /** Colors carry a swatch hex; colors/materials carry an Arabic name. */
  hex?: string;
  nameAr?: string;
}

/** Master-data entities creatable inline from the product form. */
type MasterEntityKey =
  | "brands"
  | "materials"
  | "colors"
  | "sizes"
  | "suppliers"
  | "units"
  | "countries"
  | "taxes";

/** Per-entity form shape for the inline "+ Add New" modal. */
const MASTER_MODAL_CONFIG: Record<
  MasterEntityKey,
  { label: string; nameAr: boolean; hex: boolean; rate: boolean }
> = {
  brands: { label: "Brand", nameAr: false, hex: false, rate: false },
  materials: { label: "Material", nameAr: true, hex: false, rate: false },
  colors: { label: "Color", nameAr: true, hex: true, rate: false },
  sizes: { label: "Size", nameAr: false, hex: false, rate: false },
  suppliers: { label: "Supplier", nameAr: false, hex: false, rate: false },
  units: { label: "Unit", nameAr: false, hex: false, rate: false },
  countries: { label: "Country", nameAr: false, hex: false, rate: false },
  taxes: { label: "Tax", nameAr: false, hex: false, rate: true },
};

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
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProductItem | null>(null);
  // Inline "+ Add New" master-data modal (brand/material/color/size/supplier/
  // unit/country/tax) — created straight from the product form and
  // immediately selected, so the admin never has to leave the form.
  const [addMaster, setAddMaster] = useState<MasterEntityKey | null>(null);
  const [masterDraft, setMasterDraft] = useState({ name: "", nameAr: "", hex: "#825335", rate: "0" });
  // Inline error for the Add-New modal, shown next to the name input.
  const [masterError, setMasterError] = useState("");
  const [addingMaster, setAddingMaster] = useState(false);

  const [f, setF] = useState<Record<string, FormField>>({});
  const [selectedColors, setSelectedColors] = useState<number[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<number[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [primaryImage, setPrimaryImage] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Dynamic PIM state: attribute definitions for the selected subcategory,
  // the current product's custom values (bilingual EN/AR), and manually
  // selected related products.
  const [attributes, setAttributes] = useState<CustomAttributeItem[]>([]);
  const [attrValues, setAttrValues] = useState<Record<number, CustomFieldValue>>({});
  const [relatedSelected, setRelatedSelected] = useState<number[]>([]);

  const resetForm = () => {
    setF({
      slug: "", name: "", description: "", longDescription: "",
      price: "0", costPrice: "0", discount: "0",
      stock: "0", minStock: "10",
      image: "", line: "", sku: "", barcode: "", ndNumber: "", internalCode: "", classCode: "",
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
    setEditingId(null);
    setAttributes([]);
    setAttrValues({});
    setRelatedSelected([]);
  };

  const openEdit = async (p: ProductItem) => {
    setEditingId(p.id);
    setShowForm(true);
    setMessage("");
    setError("");
    // Start from the list row so the form is usable immediately…
    setF({
      slug: p.slug, name: p.name, description: "", longDescription: "",
      price: String(p.price), costPrice: "0", discount: "0",
      stock: String(p.stock), minStock: "10",
      image: p.image, line: "", sku: p.sku, barcode: "", ndNumber: "", internalCode: "", classCode: (p as { classCode?: string }).classCode ?? "",
      specs: "[]",
      applications: "", additionalInfo: "",
      seoTitle: "", seoDescription: "",
      tags: "",
      weight: "", length: "", width: "", height: "", warranty: "",
      categoryId: "", subcategoryId: "",
      brandId: "", materialId: "", supplierId: "", unitId: "", countryId: "", taxId: "",
      departmentId: "",
      isActive: p.isActive ? "true" : "false", isFeatured: "false", isBestSeller: "false", isNewArrival: "false",
    } as Record<string, string>);
    setSelectedColors([]);
    setSelectedSizes([]);
    setGallery(p.image ? [p.image] : []);
    setPrimaryImage(p.image || "");
    setAttributes([]);
    setAttrValues({});
    setRelatedSelected([]);
    // …then load the FULL record (descriptions, relations, custom field
    // values, related products) so editing never silently drops data.
    try {
      const res = await fetch(`/api/admin/products?id=${p.id}`, { credentials: "same-origin" });
      const d = await res.json();
      if (!d.success) return;
      const full = d.data.product;
      const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
      setF((prev) => ({
        ...prev,
        slug: full.slug, name: full.name,
        description: full.description ?? "", longDescription: full.longDescription ?? "",
        price: String(full.price), costPrice: String(full.costPrice), discount: String(full.discount),
        stock: String(full.stock), minStock: String(full.minStock),
        image: full.image ?? "", line: full.line ?? "", sku: full.sku ?? "",
        barcode: full.barcode ?? "", ndNumber: full.ndNumber ?? "", internalCode: full.internalCode ?? "", classCode: full.classCode ?? "",
        specs: typeof full.specs === "string" ? full.specs : JSON.stringify(full.specs ?? []),
        applications: full.applications ?? "", additionalInfo: full.additionalInfo ?? "",
        seoTitle: full.seoTitle ?? "", seoDescription: full.seoDescription ?? "",
        tags: Array.isArray(full.tags) ? full.tags.join(", ") : "",
        weight: str(full.weight), length: str(full.length), width: str(full.width), height: str(full.height),
        warranty: full.warranty ?? "",
        categoryId: full.categoryId ? String(full.categoryId) : "",
        subcategoryId: full.subcategoryId ? String(full.subcategoryId) : "",
        brandId: full.brandId ? String(full.brandId) : "",
        materialId: full.materialId ? String(full.materialId) : "",
        supplierId: full.supplierId ? String(full.supplierId) : "",
        unitId: full.unitId ? String(full.unitId) : "",
        countryId: full.countryId ? String(full.countryId) : "",
        taxId: full.taxId ? String(full.taxId) : "",
        departmentId: full.department?.id ? String(full.department.id) : "",
        isActive: full.isActive ? "true" : "false",
        isFeatured: full.isFeatured ? "true" : "false",
        isBestSeller: full.isBestSeller ? "true" : "false",
        isNewArrival: full.isNewArrival ? "true" : "false",
      }));
      setSelectedColors((full.colors ?? []).map((c: { id: number }) => c.id));
      setSelectedSizes((full.sizes ?? []).map((s: { id: number }) => s.id));
      const imgs = Array.isArray(full.images) && full.images.length
        ? full.images
        : full.image ? [full.image] : [];
      setGallery(imgs);
      setPrimaryImage(full.image || imgs[0] || "");
      // Populate custom field values (bilingual) + related products for editing.
      setAttrValues(
        Object.fromEntries(
          (full.customAttributes ?? []).map((a: { id: number; value?: string; valueAr?: string }) => [
            a.id,
            { value: a.value ?? "", valueAr: a.valueAr ?? "" },
          ])
        )
      );
      setRelatedSelected((full.relatedProducts ?? []).map((r: { id: number }) => r.id));
    } catch {
      setError("Could not load full product details");
    }
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
    setLoading(true);
    fetch("/api/admin/products", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setProducts(d.data.products);
          setCategories(d.data.categories ?? []);
        } else {
          setError(d.error || "Failed to load products");
        }
      })
      .catch(() => setError("Failed to load products"))
      .finally(() => setLoading(false));
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

  // ---- Dynamic custom fields: load definitions for the selected subcategory ----
  const loadAttributes = useCallback(async (subId: string) => {
    if (!subId) {
      setAttributes([]);
      return;
    }
    try {
      const r = await fetch(`/api/admin/attributes?subcategoryId=${subId}`, { credentials: "same-origin" });
      const d = await r.json();
      if (d.success) setAttributes(d.data.items ?? []);
    } catch {
      /* attribute list is non-critical; leave as-is */
    }
  }, []);

  useEffect(() => {
    loadAttributes(String(f.subcategoryId ?? ""));
  }, [f.subcategoryId, loadAttributes]);

  const setAttrValue = (id: number, patch: Partial<CustomFieldValue>) => {
    setAttrValues((prev) => ({
      ...prev,
      [id]: { value: prev[id]?.value ?? "", valueAr: prev[id]?.valueAr ?? "", ...patch },
    }));
  };

  /** Current in-state list for a master entity (for duplicate pre-checks). */
  const masterLists: Record<MasterEntityKey, MasterItem[]> = {
    brands, materials, colors, sizes, suppliers, units, countries, taxes,
  };

  const openAddMaster = (entity: MasterEntityKey) => {
    setMasterError("");
    setMasterDraft({ name: "", nameAr: "", hex: "#825335", rate: "0" });
    setAddMaster(entity);
  };

  /** Re-fetch one entity's list after an inline creation (response: data.items). */
  async function refreshMasterList(entity: MasterEntityKey) {
    const d = await fetchJson(`/api/admin/master/${entity}`);
    const setters: Record<MasterEntityKey, (items: MasterItem[]) => void> = {
      brands: setBrands, materials: setMaterials, colors: setColors, sizes: setSizes,
      suppliers: setSuppliers, units: setUnits, countries: setCountries, taxes: setTaxes,
    };
    setters[entity](d.items);
  }

  /** Immediately select a freshly created item (multi-select append or select value). */
  function selectMasterItem(entity: MasterEntityKey, id: number) {
    if (entity === "colors") {
      setSelectedColors((prev) => (prev.includes(id) ? prev : [...prev, id]));
      return;
    }
    if (entity === "sizes") {
      setSelectedSizes((prev) => (prev.includes(id) ? prev : [...prev, id]));
      return;
    }
    const formKey = ({
      brands: "brandId", materials: "materialId", suppliers: "supplierId",
      units: "unitId", countries: "countryId", taxes: "taxId",
    } as const)[entity];
    update(formKey, String(id));
  }

  /** Create a new master-data item inline; it is auto-selected on success. */
  async function createMasterItem() {
    if (!addMaster) return;
    const cfg = MASTER_MODAL_CONFIG[addMaster];
    const name = masterDraft.name.trim();
    const slug = slugify(name);
    setMasterError("");
    if (!name) {
      setMasterError(`Enter a name for the ${cfg.label.toLowerCase()}.`);
      return;
    }
    if (slug.length < 2) {
      // slugify strips non-latin characters: an Arabic-only name cannot form
      // a URL slug (and the API requires >= 2 chars). Give the admin a clear
      // reason instead of an API 400.
      setMasterError("The name must contain at least 2 latin letters or digits — an Arabic-only name cannot form a URL slug. Keep Arabic in the Arabic name field.");
      return;
    }
    if (masterLists[addMaster].some((i) => i.slug === slug)) {
      setMasterError(`A ${cfg.label.toLowerCase()} with the slug "${slug}" already exists — it is already in the list; pick it there instead.`);
      return;
    }
    setAddingMaster(true);
    try {
      const body: Record<string, unknown> = { slug, name };
      if (cfg.nameAr) body.nameAr = masterDraft.nameAr.trim();
      if (cfg.hex) body.hex = masterDraft.hex;
      if (cfg.rate) body.rate = Number(masterDraft.rate) || 0;
      const res = await fetch(`/api/admin/master/${addMaster}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        const entity = addMaster;
        await refreshMasterList(entity);
        const created = data.data?.item as { id?: number } | undefined;
        if (created?.id) selectMasterItem(entity, created.id);
        setAddMaster(null);
        setMasterDraft({ name: "", nameAr: "", hex: "#825335", rate: "0" });
      } else if (res.status === 409) {
        setMasterError(`A ${cfg.label.toLowerCase()} with this name already exists — pick it from the list, or choose a different name.`);
      } else {
        setMasterError(data.error || `Could not create ${cfg.label.toLowerCase()}`);
      }
    } catch {
      setMasterError("Network error while creating — try again.");
    }
    setAddingMaster(false);
  }

  const filtered = products.filter(
    (p) => !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.slug.includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase())
  );

  const filteredCategories = categories.filter((c) => !f.departmentId || c.departmentId === Number(f.departmentId));
  const subcatsOfCategory = subcategories.filter((s) => (s as unknown as { categoryId?: number }).categoryId === Number(f.categoryId));

  const update = (key: string, value: FormField) => {
    setF((prev) => {
      const next = { ...prev, [key]: value };
      // Cascade safety: changing the department drops a category/subcategory
      // that no longer belongs to it (never leaves a stale cross-department
      // selection in the saved payload), and changing the category drops an
      // incompatible subcategory.
      if (key === "departmentId") {
        const depId = Number(value);
        const catStillValid = categories.some(
          (c) => String(c.id) === String(next.categoryId) && (depId === 0 || c.departmentId === depId)
        );
        if (!catStillValid) {
          next.categoryId = "";
          next.subcategoryId = "";
        }
      }
      if (key === "categoryId") {
        const subStillValid = subcategories.some(
          (s) => String(s.id) === String(next.subcategoryId) &&
            String((s as unknown as { categoryId?: number }).categoryId) === String(value)
        );
        if (!subStillValid) next.subcategoryId = "";
      }
      if (key === "name" && !prev.slug) next.slug = slugify(String(value));
      return next;
    });
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
      internalCode: f.internalCode, classCode: f.classCode,
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
      // Dynamic custom field values (bilingual; all optional — empty ones are
      // simply saved as empty)
      customValues: attributes.map((a) => ({
        attributeId: a.id,
        value: attrValues[a.id]?.value ?? "",
        valueAr: attrValues[a.id]?.valueAr ?? "",
      })),
      // Manually selected related products (ordered)
      relatedProductIds: relatedSelected,
    };

    const isEdit = editingId !== null;
    const url = isEdit ? "/api/admin/products" : "/api/admin/products";
    const method = isEdit ? "PATCH" : "POST";
    const body: Record<string, unknown> = isEdit ? { id: editingId, ...payload } : payload;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      setMessage(isEdit ? "Product updated" : "Product created");
      setShowForm(false);
      setEditingId(null);
      loadAll();
    } else {
      setError(data.error || (isEdit ? "Update failed" : "Create failed"));
    }
  }

  async function deleteProduct(p: ProductItem) {
    setPendingDelete(null);
    const res = await fetch(`/api/admin/products?id=${p.id}`, { method: "DELETE", credentials: "same-origin" });
    const data = await res.json();
    if (data.success) {
      setMessage(`Product "${p.name}" deleted`);
      loadAll();
    } else {
      setError(data.error || "Delete failed");
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

  const renderSelect = (
    key: string,
    label: string,
    items: MasterItem[],
    opts?: { required?: boolean; onAdd?: () => void }
  ) => {
    const cleanLabel = label.replace(/\s*\*\s*$/, "");
    const empty = (items ?? []).length === 0;
    return (
      <label key={key} className="text-sm">
        <span className="block text-gray-600 mb-1">
          {label}{opts?.required ? " *" : ""}
          {opts?.onAdd && (
            <button type="button" onClick={opts.onAdd} className="ml-2 text-xs font-semibold text-blue-700 hover:underline">
              + Add New
            </button>
          )}
        </span>
        <select
          value={empty ? "" : String(f[key] ?? "")}
          onChange={(e) => update(key, e.target.value)}
          disabled={empty}
          className={`border rounded-lg px-3 py-2 w-full ${empty ? "border-dashed border-gray-300 bg-gray-50 text-gray-400" : "border-gray-300"}`}
        >
          {empty ? (
            <option value="">
              {opts?.onAdd
                ? `No ${cleanLabel.toLowerCase()} yet — click + Add New to create one`
                : `No ${cleanLabel.toLowerCase()} available yet`}
            </option>
          ) : (
            <>
              <option value="">Select…</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </>
          )}
        </select>
      </label>
    );
  };

  const renderBool = (key: string, label: string) => (
    <label key={key} className="text-sm flex items-center gap-2 pt-6">
      <input type="checkbox" checked={f[key] === "true" || f[key] === true} onChange={(e) => update(key, e.target.checked ? "true" : "false")} className="rounded border-gray-300" />
      <span className="text-gray-600">{label}</span>
    </label>
  );

  const renderMultiSelect = (
    label: string,
    items: MasterItem[],
    selected: number[],
    toggle: (id: number) => void,
    onAdd?: () => void
  ) => (
    <div key={label} className="text-sm">
      <span className="block text-gray-600 mb-1">
        {label}
        {onAdd && (
          <button type="button" onClick={onAdd} className="ml-2 text-xs font-semibold text-blue-700 hover:underline">
            + Add New
          </button>
        )}
      </span>
      <div className="flex flex-wrap gap-1.5 border border-gray-300 rounded-lg px-3 py-2 min-h-[38px]">
        {(items ?? []).map((i) => (
          <button
            key={i.id}
            type="button"
            onClick={() => toggle(i.id)}
            title={i.nameAr || undefined}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border inline-flex items-center gap-1.5 ${selected.includes(i.id) ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"}`}
          >
            {i.hex ? (
              <span
                className={`inline-block w-3 h-3 rounded-full border ${selected.includes(i.id) ? "border-white/70" : "border-gray-400"}`}
                style={{ backgroundColor: i.hex }}
              />
            ) : null}
            {i.name}
          </button>
        ))}
        {items.length === 0 && (
          <span className="text-gray-400 text-xs">
            {onAdd ? `No ${label.toLowerCase()} yet — click + Add New to create one` : `No ${label.toLowerCase()} yet`}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete ? `Delete "${pendingDelete.name}"?` : "Delete product?"}
        body="This will hide the product from the storefront."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        danger
        onConfirm={() => pendingDelete && deleteProduct(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, slug, SKU…" className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64" />
        <button onClick={() => { setShowForm((v) => !v); if (!showForm) resetForm(); }} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          {showForm ? "Close" : "+ New Product"}
        </button>
        {editingId !== null && showForm && (
          <span className="text-xs text-blue-600 font-semibold ml-2">Editing product #{editingId}</span>
        )}
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {message && <p className="text-green-700 text-sm">{message}</p>}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 space-y-4">
          {/* ---------------- 1. Basic Information ---------------- */}
          <h3 className="font-semibold text-gray-900 border-b pb-2">1. Basic Information</h3>
          <div className="grid md:grid-cols-3 gap-3">
            {renderInput("name", "Name *")}
            {renderInput("slug", "Slug *")}
            {renderInput("sku", "SKU / Product Code")}
            {renderInput("line", "Model / Product Line")}
            {renderInput("barcode", "Barcode")}
            {renderInput("ndNumber", "ND Number")}
            {renderInput("internalCode", "Internal Item Code")}
            {renderSelect("brandId", "Brand", brands, { onAdd: () => openAddMaster("brands") })}
          </div>

          {/* Subcategory-specific custom fields — Main Information area */}
          <CustomFieldsSection
            section="HEADER"
            subcategoryId={String(f.subcategoryId ?? "")}
            attributes={attributes}
            values={attrValues}
            onValueChange={setAttrValue}
            onRefresh={() => loadAttributes(String(f.subcategoryId ?? ""))}
            onError={setError}
          />

          {/* ---------------- 2. Classification ---------------- */}
          <h3 className="font-semibold text-gray-900 border-b pb-2">2. Classification</h3>
          <p className="text-xs text-gray-400 -mt-2">Where the product appears on the storefront. Department narrows the Category list; Category narrows the Subcategory list.</p>
          <div className="grid md:grid-cols-3 gap-3">
            {renderSelect("departmentId", "Department", departments)}
            {renderSelect("categoryId", "Category *", filteredCategories)}
            {renderSelect("subcategoryId", "Subcategory", subcatsOfCategory)}
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Product Class (Internal)</span>
              <input
                type="text"
                value={String(f.classCode ?? "")}
                onChange={(e) => update("classCode", e.target.value)}
                placeholder="e.g. ZC-13 (optional)"
                className="border border-gray-300 rounded-lg px-3 py-2 w-full font-mono"
              />
              <span className="block mt-1 text-xs text-gray-400 leading-snug">
                Products with the same Class belong to the same customer-facing product family (e.g. same basket in Red/Blue/Black). Internal only — customers never see this code. Leave empty if the product is independent.
              </span>
            </label>
          </div>

          {/* Manually selected related products */}
          <div className="border border-gray-200 rounded-xl p-3 space-y-3 bg-white">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Related Products (manual)</div>
            <RelatedProductsPicker
              products={products}
              selected={relatedSelected}
              onChange={setRelatedSelected}
              selfId={editingId}
            />
          </div>

          {/* ---------------- 3. Descriptions ---------------- */}
          <h3 className="font-semibold text-gray-900 border-b pb-2">3. Descriptions</h3>
          <div className="grid md:grid-cols-1 gap-3">
            {renderInput("description", "Short Description", "textarea", { span: true })}
            {renderInput("longDescription", "Long Description", "textarea", { span: true })}
          </div>

          {/* Subcategory-specific custom fields — Product Description area */}
          <CustomFieldsSection
            section="DESCRIPTION"
            subcategoryId={String(f.subcategoryId ?? "")}
            attributes={attributes}
            values={attrValues}
            onValueChange={setAttrValue}
            onRefresh={() => loadAttributes(String(f.subcategoryId ?? ""))}
            onError={setError}
          />

          {/* ---------------- 4. Product Details ---------------- */}
          <h3 className="font-semibold text-gray-900 border-b pb-2">4. Product Details</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {renderMultiSelect("Colors", colors, selectedColors, toggleColor, () => openAddMaster("colors"))}
            {renderMultiSelect("Sizes", sizes, selectedSizes, toggleSize, () => openAddMaster("sizes"))}
          </div>
          <div className="grid md:grid-cols-4 gap-3">
            {renderInput("weight", "Weight (kg)", "number", { step: "0.001" })}
            {renderInput("length", "Length (cm)", "number", { step: "0.1" })}
            {renderInput("width", "Width (cm)", "number", { step: "0.1" })}
            {renderInput("height", "Height (cm)", "number", { step: "0.1" })}
            {renderInput("warranty", "Warranty")}
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {renderSelect("materialId", "Material", materials, { onAdd: () => openAddMaster("materials") })}
            {renderSelect("supplierId", "Supplier", suppliers, { onAdd: () => openAddMaster("suppliers") })}
            {renderSelect("unitId", "Unit", units, { onAdd: () => openAddMaster("units") })}
            {renderSelect("countryId", "Country", countries, { onAdd: () => openAddMaster("countries") })}
            {renderSelect("taxId", "Tax", taxes, { onAdd: () => openAddMaster("taxes") })}
          </div>

          {/* ---------------- 5. Pricing & Inventory ---------------- */}
          <h3 className="font-semibold text-gray-900 border-b pb-2">5. Pricing &amp; Inventory</h3>
          <div className="grid md:grid-cols-3 gap-3">
            {renderInput("price", "Selling Price (KD)", "number", { step: "0.001" })}
            {renderInput("costPrice", "Cost Price (KD)", "number", { step: "0.001" })}
            {renderInput("discount", "Discount (KD)", "number", { step: "0.001" })}
            {renderInput("stock", "Stock Quantity", "number")}
            {renderInput("minStock", "Minimum Stock", "number")}
          </div>

          {/* ---------------- 6. Specifications ---------------- */}
          <h3 className="font-semibold text-gray-900 border-b pb-2">6. Specifications</h3>
          <SpecsEditor value={String(f.specs ?? "[]")} onChange={(v) => update("specs", v)} />
          <div className="grid md:grid-cols-1 gap-3">
            {renderInput("applications", "Applications", "textarea", { span: true })}
            {renderInput("additionalInfo", "Additional Information", "textarea", { span: true })}
          </div>

          {/* Subcategory-specific custom fields — Specifications area */}
          <CustomFieldsSection
            section="SPECIFICATIONS"
            subcategoryId={String(f.subcategoryId ?? "")}
            attributes={attributes}
            values={attrValues}
            onValueChange={setAttrValue}
            onRefresh={() => loadAttributes(String(f.subcategoryId ?? ""))}
            onError={setError}
          />

          <h3 className="font-semibold text-gray-900 border-b pb-2">7. Media</h3>
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
              {saving ? "Saving…" : editingId !== null ? "Update Product" : "Create Product"}
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
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3 text-right">Actions</th>
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
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${p.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}>
                    {p.isActive ? "Active" : "Hidden"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold mr-3">Edit</button>
                  <button onClick={() => setPendingDelete(p)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Delete</button>
                </td>
              </tr>
            ))}
            {loading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Loading products…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No products found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---- + Add New master-data modal (inline from the product form) ---- */}
      {addMaster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !addingMaster && setAddMaster(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-semibold text-gray-900">Add New {MASTER_MODAL_CONFIG[addMaster].label}</h4>
            <p className="text-xs text-gray-500">
              Saved to the shared {MASTER_MODAL_CONFIG[addMaster].label.toLowerCase()} list — immediately available here and in Master Data, and auto-selected for this product.
            </p>
            <div className={MASTER_MODAL_CONFIG[addMaster].nameAr ? "grid grid-cols-2 gap-3" : ""}>
              <label className="block text-sm">
                <span className="block text-gray-600 mb-1">Name — English *</span>
                <input
                  autoFocus
                  value={masterDraft.name}
                  onChange={(e) => { setMasterDraft((d) => ({ ...d, name: e.target.value })); setMasterError(""); }}
                  placeholder={`e.g. ${MASTER_MODAL_CONFIG[addMaster].label === "Size" ? "Large" : MASTER_MODAL_CONFIG[addMaster].label}`}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                />
                <span className={`block mt-1 font-mono text-[11px] ${slugify(masterDraft.name.trim()).length >= 2 ? "text-gray-400" : "text-gray-300"}`}>
                  slug: {slugify(masterDraft.name.trim()) || "—"}
                </span>
              </label>
              {MASTER_MODAL_CONFIG[addMaster].nameAr && (
                <label className="block text-sm">
                  <span className="block text-gray-600 mb-1">الاسم — عربي</span>
                  <input
                    dir="rtl"
                    value={masterDraft.nameAr}
                    onChange={(e) => setMasterDraft((d) => ({ ...d, nameAr: e.target.value }))}
                    placeholder="مثال: رمادي غامق"
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full text-right"
                  />
                </label>
              )}
            </div>
            {MASTER_MODAL_CONFIG[addMaster].hex && (
              <label className="flex items-center gap-3 text-sm">
                <span className="text-gray-600">Swatch</span>
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(masterDraft.hex) ? masterDraft.hex : "#825335"}
                  onChange={(e) => setMasterDraft((d) => ({ ...d, hex: e.target.value }))}
                  className="h-9 w-14 rounded border border-gray-300"
                />
                <input
                  value={masterDraft.hex}
                  onChange={(e) => setMasterDraft((d) => ({ ...d, hex: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-28"
                />
              </label>
            )}
            {MASTER_MODAL_CONFIG[addMaster].rate && (
              <label className="block text-sm">
                <span className="block text-gray-600 mb-1">Rate (%) *</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={masterDraft.rate}
                  onChange={(e) => setMasterDraft((d) => ({ ...d, rate: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                />
              </label>
            )}
            {masterError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{masterError}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" disabled={addingMaster} onClick={() => setAddMaster(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-100">
                Cancel
              </button>
              <button type="button" disabled={addingMaster || !masterDraft.name.trim()}
                onClick={createMasterItem}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50">
                {addingMaster ? "Adding…" : `Add ${MASTER_MODAL_CONFIG[addMaster].label}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
