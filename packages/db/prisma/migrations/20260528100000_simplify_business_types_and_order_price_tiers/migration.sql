DO $$
BEGIN
  CREATE TYPE "ProductPriceTier" AS ENUM ('RATE_A', 'RATE_B');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "priceTier" "ProductPriceTier";

UPDATE "OrderItem" AS oi
SET "priceTier" = CASE
  WHEN oi."unitPricePaise" = COALESCE(NULLIF(p."rateBPaise", 0), p."wholesalePricePaise")
    AND oi."unitPricePaise" <> COALESCE(NULLIF(p."rateAPaise", 0), p."wholesalePricePaise")
    THEN 'RATE_B'::"ProductPriceTier"
  WHEN oi."unitPricePaise" = COALESCE(NULLIF(p."rateAPaise", 0), p."wholesalePricePaise")
    AND oi."unitPricePaise" <> COALESCE(NULLIF(p."rateBPaise", 0), p."wholesalePricePaise")
    THEN 'RATE_A'::"ProductPriceTier"
  WHEN bp."businessType"::text IN ('PHARMACY', 'CHEMIST', 'HOSPITAL')
    THEN 'RATE_B'::"ProductPriceTier"
  ELSE 'RATE_A'::"ProductPriceTier"
END
FROM "Product" AS p, "Order" AS o, "BusinessProfile" AS bp
WHERE p.id = oi."productId"
  AND o.id = oi."orderId"
  AND bp."userId" = o."buyerId";

UPDATE "OrderItem"
SET "priceTier" = 'RATE_A'::"ProductPriceTier"
WHERE "priceTier" IS NULL;

ALTER TABLE "OrderItem" ALTER COLUMN "priceTier" SET DEFAULT 'RATE_A';
ALTER TABLE "OrderItem" ALTER COLUMN "priceTier" SET NOT NULL;

ALTER TYPE "BusinessType" RENAME TO "BusinessType_old";
CREATE TYPE "BusinessType" AS ENUM ('CHEMIST', 'STOCKIST');

ALTER TABLE "BusinessProfile"
  ALTER COLUMN "businessType" TYPE "BusinessType"
  USING (
    CASE
      WHEN "businessType"::text IN ('PHARMACY', 'CHEMIST', 'HOSPITAL') THEN 'CHEMIST'
      ELSE 'STOCKIST'
    END
  )::"BusinessType";

DROP TYPE "BusinessType_old";
