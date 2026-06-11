-- HR records, payroll, expenses, and document history.
-- All tables are append/archival-friendly; employee records are archived, not deleted.

CREATE TYPE "HrDocumentType" AS ENUM ('OFFER_LETTER', 'APPOINTMENT_LETTER', 'SALARY_SLIP', 'EXPENSE_BILL');
CREATE TYPE "HrExpenseType" AS ENUM ('DAILY_ALLOWANCE', 'PETROL', 'MOBILE', 'MISCELLANEOUS');
CREATE TYPE "HrExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "EmployeeHrRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "serialNumber" INTEGER,
    "roleTitle" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "headQuarter" TEXT NOT NULL,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "offerDate" TIMESTAMP(3),
    "appointmentDate" TIMESTAMP(3),
    "mobileNumber" TEXT,
    "mailId" TEXT,
    "gender" TEXT,
    "department" TEXT,
    "region" TEXT,
    "bankDetails" TEXT,
    "bankAccountNumber" TEXT,
    "bloodGroup" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "marriageAnniversary" TIMESTAMP(3),
    "emergencyContactPerson" TEXT,
    "emergencyContactRelationship" TEXT,
    "emergencyContactNumber" TEXT,
    "panNumber" TEXT,
    "grossMonthlyPaise" BIGINT NOT NULL,
    "basicMonthlyPaise" BIGINT NOT NULL,
    "hraMonthlyPaise" BIGINT NOT NULL,
    "specialAllowanceMonthlyPaise" BIGINT NOT NULL,
    "dailyAllowancePaise" BIGINT NOT NULL DEFAULT 50000,
    "petrolAllowancePaise" BIGINT NOT NULL DEFAULT 100000,
    "mobileAllowancePaise" BIGINT NOT NULL DEFAULT 100000,
    "deductionPaise" BIGINT NOT NULL DEFAULT 20000,
    "archivedAt" TIMESTAMP(3),
    "archiveReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeHrRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmployeeHrDocument" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "generatedById" TEXT,
    "type" "HrDocumentType" NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeHrDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmployeeSalarySlip" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "generatedById" TEXT,
    "periodMonth" TIMESTAMP(3) NOT NULL,
    "workingDays" INTEGER NOT NULL,
    "leaveDays" INTEGER NOT NULL,
    "basicPaise" BIGINT NOT NULL,
    "hraPaise" BIGINT NOT NULL,
    "specialAllowancePaise" BIGINT NOT NULL,
    "grossPaise" BIGINT NOT NULL,
    "dailyAllowancePaise" BIGINT NOT NULL,
    "petrolAllowancePaise" BIGINT NOT NULL,
    "mobileAllowancePaise" BIGINT NOT NULL,
    "approvedExpensePaise" BIGINT NOT NULL DEFAULT 0,
    "bonusPaise" BIGINT NOT NULL DEFAULT 0,
    "deductionPaise" BIGINT NOT NULL DEFAULT 20000,
    "netPayPaise" BIGINT NOT NULL,
    "transactionDate" TIMESTAMP(3),
    "transactionReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeSalarySlip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmployeeExpense" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "type" "HrExpenseType" NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "description" TEXT,
    "billBucket" TEXT,
    "billKey" TEXT,
    "billContentType" TEXT,
    "status" "HrExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeExpense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmployeeWorkLog" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "worked" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeWorkLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmployeeHrRecord_employeeId_key" ON "EmployeeHrRecord"("employeeId");
CREATE UNIQUE INDEX "EmployeeHrRecord_employeeCode_key" ON "EmployeeHrRecord"("employeeCode");
CREATE INDEX "EmployeeHrRecord_archivedAt_idx" ON "EmployeeHrRecord"("archivedAt");
CREATE INDEX "EmployeeHrRecord_employeeCode_idx" ON "EmployeeHrRecord"("employeeCode");
CREATE INDEX "EmployeeHrRecord_serialNumber_idx" ON "EmployeeHrRecord"("serialNumber");

CREATE UNIQUE INDEX "EmployeeHrDocument_type_referenceNumber_key" ON "EmployeeHrDocument"("type", "referenceNumber");
CREATE INDEX "EmployeeHrDocument_employeeId_generatedAt_idx" ON "EmployeeHrDocument"("employeeId", "generatedAt");

CREATE UNIQUE INDEX "EmployeeSalarySlip_employeeId_periodMonth_key" ON "EmployeeSalarySlip"("employeeId", "periodMonth");
CREATE INDEX "EmployeeSalarySlip_periodMonth_idx" ON "EmployeeSalarySlip"("periodMonth");

CREATE INDEX "EmployeeExpense_employeeId_expenseDate_idx" ON "EmployeeExpense"("employeeId", "expenseDate");
CREATE INDEX "EmployeeExpense_status_expenseDate_idx" ON "EmployeeExpense"("status", "expenseDate");

CREATE UNIQUE INDEX "EmployeeWorkLog_employeeId_workDate_key" ON "EmployeeWorkLog"("employeeId", "workDate");
CREATE INDEX "EmployeeWorkLog_employeeId_workDate_idx" ON "EmployeeWorkLog"("employeeId", "workDate");

ALTER TABLE "EmployeeHrRecord" ADD CONSTRAINT "EmployeeHrRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeHrDocument" ADD CONSTRAINT "EmployeeHrDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeHrDocument" ADD CONSTRAINT "EmployeeHrDocument_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmployeeSalarySlip" ADD CONSTRAINT "EmployeeSalarySlip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeSalarySlip" ADD CONSTRAINT "EmployeeSalarySlip_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmployeeExpense" ADD CONSTRAINT "EmployeeExpense_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeExpense" ADD CONSTRAINT "EmployeeExpense_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmployeeWorkLog" ADD CONSTRAINT "EmployeeWorkLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
