-- CreateEnum
CREATE TYPE "CourierService" AS ENUM ('PROFESSIONAL', 'MARK', 'TEJ');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "courierService" "CourierService",
ADD COLUMN "courierDocketNumber" TEXT;
