-- CreateTable
CREATE TABLE "PackageSessionUsage" (
    "id" TEXT NOT NULL,
    "customerPackageId" TEXT NOT NULL,
    "bookingId" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageSessionUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PackageSessionUsage_bookingId_key" ON "PackageSessionUsage"("bookingId");

-- CreateIndex
CREATE INDEX "PackageSessionUsage_customerPackageId_idx" ON "PackageSessionUsage"("customerPackageId");

-- AddForeignKey
ALTER TABLE "PackageSessionUsage" ADD CONSTRAINT "PackageSessionUsage_customerPackageId_fkey" FOREIGN KEY ("customerPackageId") REFERENCES "CustomerPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageSessionUsage" ADD CONSTRAINT "PackageSessionUsage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
