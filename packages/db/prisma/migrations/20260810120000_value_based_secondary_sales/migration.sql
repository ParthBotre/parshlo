ALTER TABLE "SecondarySalesEntry"
ADD COLUMN "secondarySalesPaise" BIGINT NOT NULL DEFAULT 0;

UPDATE "SecondarySalesEntry" AS entry
SET "secondarySalesPaise" = entry."secondaryQuantity" * product."rateAPaise"
FROM "Product" AS product
WHERE product.id = entry."productId"
  AND entry."secondarySalesPaise" = 0
  AND entry."secondaryQuantity" > 0;
