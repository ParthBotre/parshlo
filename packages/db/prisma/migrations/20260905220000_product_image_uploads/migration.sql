CREATE TYPE "ProductImageState" AS ENUM ('RESERVED', 'READY', 'DELETING', 'DELETED');
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "state" "ProductImageState" NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductImage_sizeBytes_check" CHECK ("sizeBytes" > 0 AND "sizeBytes" <= 1000000)
);
CREATE UNIQUE INDEX "ProductImage_bucket_key_key" ON "ProductImage"("bucket", "key");
CREATE INDEX "ProductImage_bucket_state_idx" ON "ProductImage"("bucket", "state");
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
