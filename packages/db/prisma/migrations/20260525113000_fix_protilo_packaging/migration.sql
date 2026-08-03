-- Correct PROTILO product metadata. PROTILO catalog has only 400g DM and 200g tins.

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
  'protilo-sf-kesar',
  'protilo-chocolate',
  'protilo-kesar'
);

UPDATE "Product"
SET "status" = 'DISABLED',
    "deletedAt" = COALESCE("deletedAt", NOW()),
    "updatedAt" = NOW()
WHERE "slug" = 'protilo-vanilla';
