-- Dynamic-spec bilingual (EN/AR) companion tables.
-- Standalone tables WITHOUT foreign keys: the legacy PIM tables
-- (CustomAttribute, ProductCustomValue, Color, Material) are owned by the
-- postgres migration role and the least-privilege app role may not create
-- constraints against them. English stays in the original columns;
-- Arabic is additive with English fallback at render time.

-- CreateTable: Arabic name + multiSelect config for a CustomAttribute
CREATE TABLE "AttributeI18n" (
    "attributeId" INTEGER NOT NULL,
    "nameAr" TEXT NOT NULL DEFAULT '',
    "multiSelect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AttributeI18n_pkey" PRIMARY KEY ("attributeId")
);

-- CreateTable: Arabic label per dropdown option (EN option text = match key)
CREATE TABLE "AttributeOptionI18n" (
    "id" SERIAL NOT NULL,
    "attributeId" INTEGER NOT NULL,
    "optionEn" TEXT NOT NULL,
    "optionAr" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "AttributeOptionI18n_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttributeOptionI18n_attributeId_optionEn_key" ON "AttributeOptionI18n"("attributeId", "optionEn");

-- CreateIndex
CREATE INDEX "AttributeOptionI18n_attributeId_idx" ON "AttributeOptionI18n"("attributeId");

-- CreateTable: Arabic custom-field value per product (natural key survives EN rewrites)
CREATE TABLE "ProductCustomValueI18n" (
    "productId" INTEGER NOT NULL,
    "attributeId" INTEGER NOT NULL,
    "valueAr" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ProductCustomValueI18n_pkey" PRIMARY KEY ("productId", "attributeId")
);

-- CreateIndex
CREATE INDEX "ProductCustomValueI18n_attributeId_idx" ON "ProductCustomValueI18n"("attributeId");

-- CreateTable: Arabic color name
CREATE TABLE "ColorI18n" (
    "colorId" INTEGER NOT NULL,
    "nameAr" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ColorI18n_pkey" PRIMARY KEY ("colorId")
);

-- CreateTable: Arabic material name
CREATE TABLE "MaterialI18n" (
    "materialId" INTEGER NOT NULL,
    "nameAr" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "MaterialI18n_pkey" PRIMARY KEY ("materialId")
);
