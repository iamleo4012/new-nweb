-- Additive: Depth dimension + selectable dimension unit (mm/cm/m).
-- Companion table keyed by natural productId with NO foreign key — the
-- legacy Product table is owned by the postgres migration role and cannot
-- be ALTERed by the least-privilege app role (same pattern as
-- AttributeI18n/OrderSecurity). dimensionUnit applies to
-- length/width/height/depth; products without a row default to
-- depth = NULL, unit = 'cm' (the unit the original admin labels used).
CREATE TABLE "ProductDimension" (
    "productId" INTEGER NOT NULL,
    "depth" DECIMAL(10,3),
    "dimensionUnit" TEXT NOT NULL DEFAULT 'cm',
    CONSTRAINT "ProductDimension_pkey" PRIMARY KEY ("productId")
);
