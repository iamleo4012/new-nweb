-- CreateEnum
CREATE TYPE "AttributeSection" AS ENUM ('HEADER', 'DESCRIPTION', 'SPECIFICATIONS');

-- CreateEnum
CREATE TYPE "AttributeType" AS ENUM ('TEXT', 'LONG_TEXT', 'NUMBER', 'SELECT');

-- CreateTable
CREATE TABLE "CustomAttribute" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "section" "AttributeSection" NOT NULL DEFAULT 'SPECIFICATIONS',
    "fieldType" "AttributeType" NOT NULL DEFAULT 'TEXT',
    "subcategoryId" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCustomValue" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "attributeId" INTEGER NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ProductCustomValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelatedProduct" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "relatedId" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RelatedProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomAttribute_subcategoryId_idx" ON "CustomAttribute"("subcategoryId");

-- CreateIndex
CREATE INDEX "ProductCustomValue_attributeId_idx" ON "ProductCustomValue"("attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCustomValue_productId_attributeId_key" ON "ProductCustomValue"("productId", "attributeId");

-- CreateIndex
CREATE INDEX "RelatedProduct_relatedId_idx" ON "RelatedProduct"("relatedId");

-- CreateIndex
CREATE UNIQUE INDEX "RelatedProduct_productId_relatedId_key" ON "RelatedProduct"("productId", "relatedId");

-- AddForeignKey
ALTER TABLE "CustomAttribute" ADD CONSTRAINT "CustomAttribute_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCustomValue" ADD CONSTRAINT "ProductCustomValue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCustomValue" ADD CONSTRAINT "ProductCustomValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "CustomAttribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatedProduct" ADD CONSTRAINT "RelatedProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatedProduct" ADD CONSTRAINT "RelatedProduct_relatedId_fkey" FOREIGN KEY ("relatedId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
