CREATE TABLE "CompanyHoliday" (
  "id" TEXT NOT NULL,
  "holidayDate" TIMESTAMP(3) NOT NULL,
  "name" TEXT NOT NULL,
  "fiscalYear" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CompanyHoliday_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyHoliday_holidayDate_key" ON "CompanyHoliday"("holidayDate");
CREATE INDEX "CompanyHoliday_fiscalYear_holidayDate_idx" ON "CompanyHoliday"("fiscalYear", "holidayDate");
CREATE INDEX "CompanyHoliday_isActive_holidayDate_idx" ON "CompanyHoliday"("isActive", "holidayDate");

INSERT INTO "CompanyHoliday" ("id", "holidayDate", "name", "fiscalYear", "isActive", "createdAt", "updatedAt")
VALUES
  ('company_holiday_fy26_27_2026_05_01', '2026-05-01T00:00:00.000Z', 'May Day', 'FY 26-27', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('company_holiday_fy26_27_2026_08_15', '2026-08-15T00:00:00.000Z', 'Independence Day', 'FY 26-27', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('company_holiday_fy26_27_2026_09_14', '2026-09-14T00:00:00.000Z', 'Ganesh Chaturthi', 'FY 26-27', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('company_holiday_fy26_27_2026_10_02', '2026-10-02T00:00:00.000Z', 'Gandhi Jayanti', 'FY 26-27', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('company_holiday_fy26_27_2026_10_20', '2026-10-20T00:00:00.000Z', 'Dussehra', 'FY 26-27', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('company_holiday_fy26_27_2026_11_08', '2026-11-08T00:00:00.000Z', 'Deepavali / Lakshmi Pooja', 'FY 26-27', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('company_holiday_fy26_27_2026_11_09', '2026-11-09T00:00:00.000Z', 'Govardhan Pooja', 'FY 26-27', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('company_holiday_fy26_27_2026_11_10', '2026-11-10T00:00:00.000Z', 'Bhai Dooj', 'FY 26-27', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('company_holiday_fy26_27_2027_01_01', '2027-01-01T00:00:00.000Z', 'New Year', 'FY 26-27', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('company_holiday_fy26_27_2027_01_14', '2027-01-14T00:00:00.000Z', 'Makar Sankranti', 'FY 26-27', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('company_holiday_fy26_27_2027_01_26', '2027-01-26T00:00:00.000Z', 'Republic Day', 'FY 26-27', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('company_holiday_fy26_27_2027_03_22', '2027-03-22T00:00:00.000Z', 'Holi (2nd Day)', 'FY 26-27', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("holidayDate") DO UPDATE SET
  "name" = EXCLUDED."name",
  "fiscalYear" = EXCLUDED."fiscalYear",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;
