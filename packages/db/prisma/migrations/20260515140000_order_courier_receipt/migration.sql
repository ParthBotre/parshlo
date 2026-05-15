-- Courier receipt metadata on orders (S3 object referenced at dispatch).
ALTER TABLE "Order" ADD COLUMN "courierReceiptBucket" TEXT;
ALTER TABLE "Order" ADD COLUMN "courierReceiptKey" TEXT;
ALTER TABLE "Order" ADD COLUMN "courierReceiptContentType" TEXT;
ALTER TABLE "Order" ADD COLUMN "courierReceiptUploadedAt" TIMESTAMP(3);
