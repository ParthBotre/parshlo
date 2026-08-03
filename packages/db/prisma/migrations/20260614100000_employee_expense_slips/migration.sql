CREATE TABLE "EmployeeExpenseSlip" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "generatedById" TEXT,
    "periodMonth" TIMESTAMP(3) NOT NULL,
    "workingDays" INTEGER NOT NULL,
    "dailyAllowancePaise" BIGINT NOT NULL,
    "petrolAllowancePaise" BIGINT NOT NULL,
    "mobileAllowancePaise" BIGINT NOT NULL,
    "monthlyAllowanceCapPaise" BIGINT NOT NULL,
    "calculatedDailyAllowancePaise" BIGINT NOT NULL,
    "calculatedAllowancePaise" BIGINT NOT NULL,
    "approvedExtraExpensePaise" BIGINT NOT NULL DEFAULT 0,
    "pendingExtraExpensePaise" BIGINT NOT NULL DEFAULT 0,
    "totalPayablePaise" BIGINT NOT NULL,
    "transactionDate" TIMESTAMP(3),
    "transactionReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeExpenseSlip_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmployeeExpenseSlip_employeeId_periodMonth_key" ON "EmployeeExpenseSlip"("employeeId", "periodMonth");
CREATE INDEX "EmployeeExpenseSlip_periodMonth_idx" ON "EmployeeExpenseSlip"("periodMonth");

ALTER TABLE "EmployeeExpenseSlip" ADD CONSTRAINT "EmployeeExpenseSlip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeExpenseSlip" ADD CONSTRAINT "EmployeeExpenseSlip_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
