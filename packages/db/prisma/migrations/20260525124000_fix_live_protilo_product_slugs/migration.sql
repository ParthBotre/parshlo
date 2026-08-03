-- Correct live PROTILO rows whose slugs were generated from product names.
-- Keep canonical slugs here too so fresh databases and existing staging/prod data agree.

UPDATE "Product"
SET "packaging" = '400g tin',
    "description" = '(400G TIN)',
    "updatedAt" = NOW()
WHERE "slug" = 'protilo-dm';

UPDATE "Product"
SET "packaging" = '200g tin',
    "description" = '(200G TIN)',
    "updatedAt" = NOW()
WHERE "slug" IN (
  'protilo-sf',
  'protilo-sf-chocolate',
  'protilo-sf-200-gm-powder-chocolate',
  'protilo-sf-200-gm-powder-chocolate-2',
  'protilo-sf-kesar',
  'protilo-sf-200-gm-powder-kesar',
  'protilo-chocolate',
  'protilo-200-gm-powder-chocolate',
  'protilo-kesar',
  'protilo-200-gm-powder-kesar'
);

UPDATE "Product"
SET "status" = 'DISABLED',
    "deletedAt" = COALESCE("deletedAt", NOW()),
    "updatedAt" = NOW()
WHERE "slug" = 'protilo-vanilla';
