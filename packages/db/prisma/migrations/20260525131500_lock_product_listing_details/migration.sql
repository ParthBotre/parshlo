-- Lock down product listing details and remove duplicate PROTILO SF Chocolate rows.

UPDATE "Product"
SET "packaging" = '10 tablets/strip - 10 strips/box',
    "updatedAt" = NOW()
WHERE "slug" = 'calonest-xt-tab';

UPDATE "Product"
SET "packaging" = '30 tablets/bottle',
    "updatedAt" = NOW()
WHERE "slug" = 'fracsure-tab';

UPDATE "Product"
SET "packaging" = '15 capsules/strip - 10 strips/box',
    "updatedAt" = NOW()
WHERE "slug" = 'tendofab-plus-cap';

UPDATE "Product"
SET "packaging" = '15 tablets/strip - 10 strips/box',
    "updatedAt" = NOW()
WHERE "slug" IN ('tendofab-v-tab', 'upfolet-tab');

UPDATE "Product"
SET "packaging" = '200g tin',
    "description" = '(200G TIN)',
    "updatedAt" = NOW()
WHERE "slug" IN (
  'protilo-sf',
  'protilo-sf-200-gm-powder-chocolate'
);

UPDATE "Product"
SET "status" = 'DISABLED',
    "deletedAt" = COALESCE("deletedAt", NOW()),
    "updatedAt" = NOW()
WHERE "slug" IN (
  'protilo-sf-chocolate',
  'protilo-sf-200-gm-powder-chocolate-2'
);

UPDATE "Product"
SET "status" = 'DISABLED',
    "deletedAt" = COALESCE("deletedAt", NOW()),
    "updatedAt" = NOW()
WHERE "slug" = 'protilo-sf'
  AND EXISTS (
    SELECT 1
    FROM "Product" AS live_sf
    WHERE live_sf."slug" = 'protilo-sf-200-gm-powder-chocolate'
      AND live_sf."deletedAt" IS NULL
      AND live_sf."status" <> 'DISABLED'
  );
