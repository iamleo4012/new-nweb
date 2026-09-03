-- Additive: Depth dimension + selectable dimension unit, stored directly on
-- Product alongside length/width/height. Applied by the postgres table
-- owner (the least-privilege app role cannot ALTER the legacy Product
-- table). Existing rows keep their length/width/height exactly as they
-- were; dimensionUnit backfills to the safe default 'cm'; depth stays
-- NULL for products that never had one.
ALTER TABLE "Product" ADD COLUMN "depth" DECIMAL(10,3);
ALTER TABLE "Product" ADD COLUMN "dimensionUnit" TEXT NOT NULL DEFAULT 'cm';
