-- Correct catalog packaging metadata after baseline import.
-- Product prices and visibility are intentionally left unchanged.

UPDATE "Product"
SET "packaging" = '10 tablets/strip - 10 strips/box',
    "updatedAt" = NOW()
WHERE "slug" = 'calonest-xt-tab';

UPDATE "Product"
SET "packaging" = '30 tablets/bottle',
    "updatedAt" = NOW()
WHERE "slug" = 'fracsure-tab';

UPDATE "Product"
SET "packaging" = '200g tin',
    "updatedAt" = NOW()
WHERE "slug" IN ('protilo-sf', 'protilo-sf-chocolate', 'protilo-sf-kesar');

UPDATE "Product"
SET "packaging" = '15 capsules/strip - 10 strips/box',
    "updatedAt" = NOW()
WHERE "slug" = 'tendofab-plus-cap';

UPDATE "Product"
SET "packaging" = '15 tablets/strip - 10 strips/box',
    "updatedAt" = NOW()
WHERE "slug" IN ('tendofab-plus-tab', 'tendofab-v-tab', 'upfolet-tab');
