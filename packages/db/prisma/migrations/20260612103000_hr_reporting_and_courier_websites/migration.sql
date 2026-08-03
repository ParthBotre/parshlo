-- Add field-reporting detail to HR work logs and optional courier tracking website URLs.
ALTER TABLE "EmployeeWorkLog"
  ADD COLUMN "location" TEXT,
  ADD COLUMN "orthCalls" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "mdCalls" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "gpCalls" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "otherCalls" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "totalDoctors" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "totalChemist" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "CourierPartner"
  ADD COLUMN "websiteUrl" TEXT;
