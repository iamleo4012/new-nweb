-- Staff read-state: "SEEN" marks that store staff has opened (viewed) an
-- order. Additive enum value only — no existing rows or statuses change.
ALTER TYPE "OrderStatus" ADD VALUE 'SEEN';
