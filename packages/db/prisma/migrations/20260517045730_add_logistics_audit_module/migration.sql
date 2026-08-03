-- CreateEnum
CREATE TYPE "AdminLogisticsType" AS ENUM ('INCOMING', 'OUTGOING');

-- CreateEnum
CREATE TYPE "AuditMatchStatus" AS ENUM ('UNBILLED', 'MATCHED', 'DISCREPANCY', 'MANUALLY_RESOLVED');

-- CreateEnum
CREATE TYPE "AdminStatementStatus" AS ENUM ('UNRECONCILED', 'RECONCILED', 'FLAGGED', 'PAID');

-- CreateTable
CREATE TABLE "CourierPartner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminConsignmentLog" (
    "id" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "type" "AdminLogisticsType" NOT NULL,
    "docketNumber" TEXT NOT NULL,
    "consignmentDate" TIMESTAMP(3) NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "boxCount" INTEGER NOT NULL DEFAULT 1,
    "status" "AuditMatchStatus" NOT NULL DEFAULT 'UNBILLED',
    "statementId" TEXT,
    "associatedPoNumber" TEXT,
    "associatedOrderNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminConsignmentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierLedgerStatement" (
    "id" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "statementInvoiceNumber" TEXT NOT NULL,
    "billingPeriodStart" TIMESTAMP(3) NOT NULL,
    "billingPeriodEnd" TIMESTAMP(3) NOT NULL,
    "courierChargedTotalPaise" BIGINT NOT NULL,
    "systemCalculatedTotalPaise" BIGINT NOT NULL,
    "status" "AdminStatementStatus" NOT NULL DEFAULT 'UNRECONCILED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierLedgerStatement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminConsignmentLog_status_idx" ON "AdminConsignmentLog"("status");

-- CreateIndex
CREATE INDEX "AdminConsignmentLog_docketNumber_idx" ON "AdminConsignmentLog"("docketNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AdminConsignmentLog_courierId_docketNumber_key" ON "AdminConsignmentLog"("courierId", "docketNumber");

-- CreateIndex
CREATE INDEX "CourierLedgerStatement_status_idx" ON "CourierLedgerStatement"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CourierLedgerStatement_courierId_statementInvoiceNumber_key" ON "CourierLedgerStatement"("courierId", "statementInvoiceNumber");

-- AddForeignKey
ALTER TABLE "AdminConsignmentLog" ADD CONSTRAINT "AdminConsignmentLog_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "CourierPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminConsignmentLog" ADD CONSTRAINT "AdminConsignmentLog_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "CourierLedgerStatement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierLedgerStatement" ADD CONSTRAINT "CourierLedgerStatement_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "CourierPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
