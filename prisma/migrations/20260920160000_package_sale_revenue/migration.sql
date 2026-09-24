-- AlterTable
-- bookingId jadi opsional supaya Transaction bisa dipakai buat catat
-- pendapatan yang nggak nempel ke booking (yaitu penjualan paket).
ALTER TABLE "Transaction" ALTER COLUMN "bookingId" DROP NOT NULL;
ALTER TABLE "Transaction" ADD COLUMN     "customerPackageId" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_customerPackageId_idx" ON "Transaction"("customerPackageId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_customerPackageId_fkey" FOREIGN KEY ("customerPackageId") REFERENCES "CustomerPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
