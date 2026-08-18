-- Security remediation: guest order-tracking access token + order idempotency.
-- Standalone table keyed by the globally-unique orderNumber (no FK on the
-- legacy "Order" table — it is owned by the postgres migration role, and the
-- least-privilege app role cannot create constraints against it).
--   tokenHash      SHA-256 of the raw capability token (raw never stored).
--   idempotencyKey replay guard — same key returns the original order.

-- CreateTable
CREATE TABLE "OrderSecurity" (
    "orderNumber" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "idempotencyKey" TEXT,

    CONSTRAINT "OrderSecurity_pkey" PRIMARY KEY ("orderNumber")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderSecurity_tokenHash_key" ON "OrderSecurity"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "OrderSecurity_idempotencyKey_key" ON "OrderSecurity"("idempotencyKey");
