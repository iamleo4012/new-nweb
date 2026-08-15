-- Sprint 2: Order Verification Workflow migration
-- Replaces the old OrderStatus enum with the full lifecycle,
-- adds OrderItemStatus, PosStatus, staffNotes, posStatus, itemStatus,
-- and the Notification table.

-- 1. Rename old OrderStatus enum so we can create a fresh one.
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";

-- 2. Create new OrderStatus enum with the full lifecycle.
CREATE TYPE "OrderStatus" AS ENUM (
  'PENDING',
  'UNDER_REVIEW',
  'READY_FOR_CONFIRMATION',
  'CONFIRMED',
  'PACKING',
  'READY_FOR_DELIVERY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_BY_STAFF'
);

-- 3. Migrate the Order.status column to the new enum.
-- All existing values (PENDING, CONFIRMED) exist in both enums.
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus" USING "status"::text::"OrderStatus";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- 4. Migrate OrderStatusEvent.status column similarly.
ALTER TABLE "OrderStatusEvent" ALTER COLUMN "status" TYPE "OrderStatus" USING "status"::text::"OrderStatus";

-- 5. Drop the old enum.
DROP TYPE "OrderStatus_old";

-- 6. Create OrderItemStatus enum.
CREATE TYPE "OrderItemStatus" AS ENUM (
  'PENDING',
  'AVAILABLE',
  'UNAVAILABLE',
  'REMOVED_AFTER_CONFIRMATION',
  'DELIVERED'
);

-- 7. Create PosStatus enum.
CREATE TYPE "PosStatus" AS ENUM (
  'NOT_CREATED',
  'INVOICED',
  'HANDED_TO_DELIVERY'
);

-- 8. Add new columns to Order.
ALTER TABLE "Order" ADD COLUMN "staffNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Order" ADD COLUMN "posStatus" "PosStatus" NOT NULL DEFAULT 'NOT_CREATED';

-- 9. Add itemStatus to OrderItem.
ALTER TABLE "OrderItem" ADD COLUMN "itemStatus" "OrderItemStatus" NOT NULL DEFAULT 'PENDING';

-- 10. Create Notification table.
CREATE TABLE "Notification" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER,
  "orderId" INTEGER,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. Add indexes for Notification.
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_orderId_idx" ON "Notification"("orderId");

-- 12. Add FK from Notification to Order.
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
