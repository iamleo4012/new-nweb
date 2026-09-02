-- Stage 3: internal Product Class grouping code.
-- Additive, backward-compatible: defaults to '' (independent product).
-- STRICTLY INTERNAL — never selected into public catalog/detail responses.
ALTER TABLE "Product" ADD COLUMN "classCode" TEXT NOT NULL DEFAULT '';
