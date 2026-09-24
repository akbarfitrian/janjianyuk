import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireActiveOutletSession } from "@/lib/api-session";
import { expandDateRange, parseReason } from "@/lib/schedule";
import { endOfJakartaDay, startOfJakartaDay } from "@/lib/tz";

// Catat cuti staff, satu hari atau rentang. Tanggal yang sudah tercatat
// dilewati.
export async function POST(request: Request) {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const body = await request.json().catch(() => ({}));
  const { staffId, startDate, endDate, reason } = body as {
    staffId?: unknown;
    startDate?: unknown;
    endDate?: unknown;
    reason?: unknown;
  };

  if (typeof staffId !== "string" || !staffId) {
    return NextResponse.json({ error: "Pilih staff dulu." }, { status: 400 });
  }
  const staff = await prisma.staff.findUnique({ where: { id: staffId } });
  if (!staff || staff.outletId !== ctx.outletId) {
    return NextResponse.json(
      { error: "Staff tidak ditemukan." },
      { status: 404 },
    );
  }

  const range = expandDateRange(startDate, endDate);
  if ("error" in range) {
    return NextResponse.json({ error: range.error }, { status: 400 });
  }
  const parsedReason = parseReason(reason);
  if ("error" in parsedReason) {
    return NextResponse.json({ error: parsedReason.error }, { status: 400 });
  }

  await prisma.staffTimeOff.createMany({
    data: range.dates.map((date) => ({
      staffId,
      date,
      reason: parsedReason.value,
    })),
    skipDuplicates: true,
  });

  const timeOffs = await prisma.staffTimeOff.findMany({
    where: { staffId, date: { in: range.dates } },
    orderBy: { date: "asc" },
    select: { id: true, staffId: true, date: true, reason: true },
  });

  // Booking yang sudah di-assign ke staff ini di tanggal itu nggak diubah —
  // cuma dihitung buat pengingat di panel.
  const existingBookings = await prisma.booking.count({
    where: {
      outletId: ctx.outletId,
      staffId,
      status: { in: ["pending", "confirmed"] },
      startTime: {
        gte: startOfJakartaDay(range.dates[0]),
        lt: endOfJakartaDay(range.dates[range.dates.length - 1]),
      },
    },
  });

  return NextResponse.json({ timeOffs, existingBookings }, { status: 201 });
}
