-- Secondary sales tracking for stockists.
-- The initial stockist rows come from the workbook sheet names only; no workbook figures are imported.

CREATE TABLE "SecondarySalesStockist" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "buyerId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SecondarySalesStockist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecondarySalesEntry" (
  "id" TEXT NOT NULL,
  "stockistId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "periodMonth" TIMESTAMP(3) NOT NULL,
  "secondaryQuantity" INTEGER NOT NULL DEFAULT 0,
  "closingQuantity" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SecondarySalesEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecondarySalesEditor" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "grantedById" TEXT,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SecondarySalesEditor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SecondarySalesStockist_name_key" ON "SecondarySalesStockist"("name");
CREATE UNIQUE INDEX "SecondarySalesStockist_buyerId_key" ON "SecondarySalesStockist"("buyerId");
CREATE INDEX "SecondarySalesStockist_isActive_name_idx" ON "SecondarySalesStockist"("isActive", "name");

CREATE UNIQUE INDEX "SecondarySalesEntry_stockistId_productId_periodMonth_key" ON "SecondarySalesEntry"("stockistId", "productId", "periodMonth");
CREATE INDEX "SecondarySalesEntry_periodMonth_idx" ON "SecondarySalesEntry"("periodMonth");
CREATE INDEX "SecondarySalesEntry_productId_idx" ON "SecondarySalesEntry"("productId");

CREATE UNIQUE INDEX "SecondarySalesEditor_userId_key" ON "SecondarySalesEditor"("userId");
CREATE INDEX "SecondarySalesEditor_revokedAt_idx" ON "SecondarySalesEditor"("revokedAt");

ALTER TABLE "SecondarySalesStockist"
  ADD CONSTRAINT "SecondarySalesStockist_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SecondarySalesEntry"
  ADD CONSTRAINT "SecondarySalesEntry_stockistId_fkey"
  FOREIGN KEY ("stockistId") REFERENCES "SecondarySalesStockist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SecondarySalesEntry"
  ADD CONSTRAINT "SecondarySalesEntry_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SecondarySalesEntry"
  ADD CONSTRAINT "SecondarySalesEntry_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SecondarySalesEditor"
  ADD CONSTRAINT "SecondarySalesEditor_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SecondarySalesEditor"
  ADD CONSTRAINT "SecondarySalesEditor_grantedById_fkey"
  FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "SecondarySalesStockist" ("id", "name", "updatedAt") VALUES
  ('sec_stockist_disilva', 'DISILVA', CURRENT_TIMESTAMP),
  ('sec_stockist_amd', 'AMD', CURRENT_TIMESTAMP),
  ('sec_stockist_girdharlal', 'GIRDHARLAL', CURRENT_TIMESTAMP),
  ('sec_stockist_ambica', 'AMBICA', CURRENT_TIMESTAMP),
  ('sec_stockist_tushar', 'TUSHAR', CURRENT_TIMESTAMP),
  ('sec_stockist_sunrise', 'SUNRISE', CURRENT_TIMESTAMP),
  ('sec_stockist_konkan', 'KONKAN', CURRENT_TIMESTAMP),
  ('sec_stockist_nitin_agency', 'NITIN AGENCY', CURRENT_TIMESTAMP),
  ('sec_stockist_shri_ganesh', 'SHRI GANESH', CURRENT_TIMESTAMP),
  ('sec_stockist_vighnaharta', 'VIGHNAHARTA', CURRENT_TIMESTAMP),
  ('sec_stockist_venkatesh_majalgaon', 'VENKATESH MAJALGAON', CURRENT_TIMESTAMP),
  ('sec_stockist_atharv_beed', 'ATHARV BEED', CURRENT_TIMESTAMP),
  ('sec_stockist_venkatesh_phaltan', 'VENKATESH PHALTAN', CURRENT_TIMESTAMP),
  ('sec_stockist_ashirwad_med', 'ASHIRWAD MED', CURRENT_TIMESTAMP),
  ('sec_stockist_matrubal', 'MATRUBAL', CURRENT_TIMESTAMP),
  ('sec_stockist_sneh', 'SNEH', CURRENT_TIMESTAMP),
  ('sec_stockist_shri_krishnanand_kol', 'SHRI KRISHNANAND KOL', CURRENT_TIMESTAMP),
  ('sec_stockist_sai_sangli', 'SAI SANGLI', CURRENT_TIMESTAMP),
  ('sec_stockist_niranjan', 'NIRANJAN', CURRENT_TIMESTAMP),
  ('sec_stockist_anuyash', 'ANUYASH', CURRENT_TIMESTAMP);
