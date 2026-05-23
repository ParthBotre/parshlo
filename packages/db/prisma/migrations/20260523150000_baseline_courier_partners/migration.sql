INSERT INTO "CourierPartner" ("id", "name", "isActive", "createdAt", "updatedAt")
VALUES
  ('cld001profess00000000001', 'Professional Couriers', TRUE, NOW(), NOW()),
  ('cld002tej0000000000000002', 'Tej Couriers', TRUE, NOW(), NOW()),
  ('cld003mark0000000000000003', 'Mark Couriers', TRUE, NOW(), NOW()),
  ('cld004shipkart00000000004', 'SHIPKART', TRUE, NOW(), NOW()),
  ('cld005vishwa000000000005', 'VISHWA COURIERS', TRUE, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "isActive" = TRUE,
  "updatedAt" = NOW();
