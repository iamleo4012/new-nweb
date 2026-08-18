-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPERADMIN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "designation" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");
