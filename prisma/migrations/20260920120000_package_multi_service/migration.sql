-- Paket sekarang bisa berisi beberapa layanan (mis. potong rambut + warnain
-- rambut): Package.serviceId (satu layanan) diganti tabel PackageItem
-- (banyak layanan per paket). Paket yang sudah ada dipertahankan — layanan
-- lamanya disalin dulu ke PackageItem sebelum kolom lamanya dibuang.

-- CreateTable
CREATE TABLE "PackageItem" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "PackageItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PackageItem_serviceId_idx" ON "PackageItem"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "PackageItem_packageId_serviceId_key" ON "PackageItem"("packageId", "serviceId");

-- AddForeignKey
ALTER TABLE "PackageItem" ADD CONSTRAINT "PackageItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageItem" ADD CONSTRAINT "PackageItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: tiap paket lama jadi paket dengan satu layanan.
INSERT INTO "PackageItem" ("id", "packageId", "serviceId")
SELECT gen_random_uuid()::text, "id", "serviceId" FROM "Package";

-- DropForeignKey
ALTER TABLE "Package" DROP CONSTRAINT "Package_serviceId_fkey";

-- DropIndex
DROP INDEX "Package_serviceId_idx";

-- AlterTable
ALTER TABLE "Package" DROP COLUMN "serviceId";
