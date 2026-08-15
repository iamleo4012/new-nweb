-- Order ownership snapshot — permanent customer/ownership identifier.
--
-- Adds two columns to "Order" that are captured at checkout and NEVER mutated
-- by account deletion:
--   original_user_id    — the stable ownership identifier (the account that
--                         placed the order). Survives account deletion.
--   original_user_email — the historical customer email for admin/legal records.
--
-- The live "userId" / "customerEmail" may be nulled / tombstoned when the
-- placing account is deleted, but these snapshot columns persist so every
-- historical order stays identifiable and its customer info is never lost.
--
-- Backfill: copy existing ownership data into the new columns so NO historical
-- order is left with an incorrect or missing snapshot. Existing data is
-- preserved verbatim — nothing is overwritten or dropped.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "original_user_email" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "original_user_id" INTEGER;

-- Backfill from existing ownership columns.
-- original_user_id  <- userId          (null for guest/deleted-account orders stays null)
-- original_user_email <- customerEmail (only where the snapshot is still empty)
UPDATE "Order" SET "original_user_id" = "userId"
  WHERE "original_user_id" IS NULL AND "userId" IS NOT NULL;

UPDATE "Order" SET "original_user_email" = "customerEmail"
  WHERE "original_user_email" = '' AND "customerEmail" <> '';

-- CreateIndex
CREATE INDEX "Order_original_user_id_idx" ON "Order"("original_user_id");

-- CreateIndex
CREATE INDEX "Order_original_user_email_idx" ON "Order"("original_user_email");
