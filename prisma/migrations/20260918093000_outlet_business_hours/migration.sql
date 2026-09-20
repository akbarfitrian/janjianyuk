-- AlterTable
ALTER TABLE "Outlet" ADD COLUMN     "openTime" TEXT NOT NULL DEFAULT '09:00',
ADD COLUMN     "closeTime" TEXT NOT NULL DEFAULT '18:00',
ADD COLUMN     "breakStartTime" TEXT,
ADD COLUMN     "breakEndTime" TEXT;
