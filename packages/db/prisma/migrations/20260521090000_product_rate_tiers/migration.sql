ALTER TABLE "Product"
  ADD COLUMN "rateAPaise" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "rateBPaise" BIGINT NOT NULL DEFAULT 0;

UPDATE "Product"
SET "rateAPaise" = "wholesalePricePaise",
    "rateBPaise" = "wholesalePricePaise"
WHERE "rateAPaise" = 0
  AND "rateBPaise" = 0;
