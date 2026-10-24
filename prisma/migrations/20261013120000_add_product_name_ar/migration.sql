-- Arabic product display name.
-- Additive, backward-compatible: defaults to '' (storefront falls back to
-- the English `name` while empty). Existing rows and data are untouched.
ALTER TABLE "Product" ADD COLUMN "nameAr" TEXT NOT NULL DEFAULT '';
