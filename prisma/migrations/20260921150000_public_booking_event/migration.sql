-- CreateTable
CREATE TABLE "PublicBookingEvent" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicBookingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicBookingEvent_outletId_ipHash_createdAt_idx" ON "PublicBookingEvent"("outletId", "ipHash", "createdAt");
