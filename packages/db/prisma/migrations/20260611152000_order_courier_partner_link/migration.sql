-- Link order shipment tracking to editable courier partners.
ALTER TABLE "Order" ADD COLUMN "courierPartnerId" TEXT;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_courierPartnerId_fkey"
  FOREIGN KEY ("courierPartnerId") REFERENCES "CourierPartner"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Order_courierPartnerId_idx" ON "Order"("courierPartnerId");

WITH mapped AS (
  SELECT
    o.id AS "orderId",
    cp.id AS "courierPartnerId"
  FROM "Order" o
  JOIN "CourierPartner" cp
    ON cp.name = CASE o."courierService"
      WHEN 'PROFESSIONAL' THEN 'Professional Couriers'
      WHEN 'MARK' THEN 'Mark Couriers'
      WHEN 'TEJ' THEN 'Tej Couriers'
      WHEN 'SHIPKART' THEN 'SHIPKART'
      WHEN 'VISHWA' THEN 'VISHWA COURIERS'
    END
  WHERE o."courierService" IS NOT NULL
)
UPDATE "Order" o
SET "courierPartnerId" = mapped."courierPartnerId"
FROM mapped
WHERE o.id = mapped."orderId";
