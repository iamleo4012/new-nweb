-- WhatsApp send-state: records that the staff WhatsApp message was sent
-- for this order. Additive column only -- existing rows default to NOT sent.
ALTER TABLE "Order" ADD COLUMN "whatsappSent" BOOLEAN NOT NULL DEFAULT false;
