-- Add employee name prefix support and increment letter document type.
ALTER TYPE "HrDocumentType" ADD VALUE IF NOT EXISTS 'INCREMENT_LETTER';

ALTER TABLE "EmployeeHrRecord"
ADD COLUMN IF NOT EXISTS "namePrefix" TEXT;
