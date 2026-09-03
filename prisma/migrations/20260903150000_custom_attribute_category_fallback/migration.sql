-- Additive: category-level fallback scope for custom field definitions.
-- CustomAttribute.subcategoryId becomes nullable and a new categoryId column
-- (natural id, NO foreign key — Category is owned by the postgres migration
-- role) lets categories WITHOUT subcategories carry their own field
-- definitions. Exactly one of the two is set (enforced by the API layer).
-- Existing rows keep their subcategoryId — no backfill, no data change.
ALTER TABLE "CustomAttribute" ALTER COLUMN "subcategoryId" DROP NOT NULL;
ALTER TABLE "CustomAttribute" ADD COLUMN "categoryId" INTEGER;
CREATE INDEX "CustomAttribute_categoryId_idx" ON "CustomAttribute"("categoryId");
