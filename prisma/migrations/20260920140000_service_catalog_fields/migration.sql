-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "category" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "priceFrom" BOOLEAN NOT NULL DEFAULT false;
