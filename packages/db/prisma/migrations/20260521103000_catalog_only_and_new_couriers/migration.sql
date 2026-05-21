-- Keep product rows for audit/history, but hide SKUs that are not present in
-- the approved Prashlo catalog sheet.
UPDATE "Product"
SET "status" = 'DISABLED'::"ProductStatus",
    "updatedAt" = NOW()
WHERE "slug" IN (
  'flexcel-gel',
  'gbcard-sr-tab',
  'itabro-200-cap',
  'protilo-vanilla',
  'tendofab-plus-tab',
  'tolecya-tab'
);

-- All rows in prashlo_catalog.md carry GST factor 1.05, i.e. 5% included in
-- PTR/PTS. Keep GST display-only and aligned with the catalog.
UPDATE "Product"
SET "gstRate" = 'FIVE'::"GstRate",
    "updatedAt" = NOW()
WHERE "slug" IN (
  'calonest-plus-cap',
  'calonest-xt-tab',
  'calonest-tab',
  'collamat-plus-tab',
  'cosamax-dn-tab',
  'cumigold-cap',
  'defcya-12-mg-cap',
  'defcya-6-tab',
  'dexlet-d-cap',
  'dexlet-tab',
  'dibenza-spray',
  'ezyrol-d3-60k-cap',
  'ezyrol-nano-shots',
  'fawound-ds-tab',
  'fawound-plus-tab',
  'fawound-tab',
  'femsure-tab',
  'flexcel-60-tab',
  'flexcel-90-tab',
  'flexcel-eth-4-tab',
  'fracsure-plus-tab',
  'fracsure-tab',
  'gbcard-nt-tab',
  'ironest-tab',
  'ironest-xt-tab',
  'metiace-tab',
  'protilo-dm',
  'protilo-sf',
  'protilo-sf-chocolate',
  'protilo-sf-kesar',
  'protilo-chocolate',
  'protilo-kesar',
  'roxinoe-dt-tab',
  'tendofab-plus-cap',
  'tendofab-v-tab',
  'tremecya-tab',
  'tremecya-d-tab',
  'upfolet-plus-tab',
  'upfolet-tab'
);

ALTER TYPE "CourierService" ADD VALUE IF NOT EXISTS 'SHIPKART';
ALTER TYPE "CourierService" ADD VALUE IF NOT EXISTS 'VISHWA';

INSERT INTO "CourierPartner" ("id", "name", "isActive", "createdAt", "updatedAt")
VALUES
  ('cld004shipkart00000000004', 'SHIPKART', TRUE, NOW(), NOW()),
  ('cld005vishwa000000000005', 'VISHWA COURIERS', TRUE, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "isActive" = TRUE,
  "updatedAt" = NOW();
