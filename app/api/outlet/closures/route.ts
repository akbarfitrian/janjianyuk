import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireActiveOutletSession } from "@/lib/api-session";
import { expandDateRange, parseReason } from "@/lib/schedule";
import { endOfJakartaDay, startOfJakartaDay } from "@/lib/tz";

// Tambah tanggal libur outlet, satu hari atau rentang (Lebaran, dll). Tanggal
// yang sudah terdaftar dilewati, jadi aman kalau rentangnya tumpang tindih.
export async function POST(request: Request) {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const body = await request.json().catch(() => ({}));
  const { startDate, endDate, reason } = body as {
    startDate?: unknown;
    endDate?: unknown;
    reason?: unknown;
  };

  const range = expandDateRange(startDate, endDate);
  if ("error" in range) {
    return NextResponse.json({ error: range.error }, { status: 400 });
  }
  const parsedReason = parseReason(reason);
  if ("error" in parsedReason) {
    return NextResponse.json({ error: parsedReason.error }, { status: 400 });
  }

  await prisma.outletClosure.createMany({
    data: range.dates.map((date) => ({
      outletId: ctx.outletId,
      date,
      reason: parsedReason.value,
    })),
    skipDuplicates: true,
  });

  const closures = await prisma.outletClosure.findMany({
    where: { outletId: ctx.outletId, date: { in: range.dates } },
    orderBy: { date: "asc" },
    select: { id: true, date: true, reason: true },
  });

  // Booking yang sudah ada di tanggal itu nggak dibatalin otomatis — cuma
  // dihitung biar panel bisa ngingetin owner buat ngehubungi pelanggannya.
  const existingBookings = await prisma.booking.count({
    where: {
      outletId: ctx.outletId,
      status: { in: ["pending", "confirmed"] },
      startTime: {
        gte: startOfJakartaDay(range.dates[0]),
        lt: endOfJakartaDay(range.dates[range.dates.length - 1]),
      },
    },
  });

  return NextResponse.json({ closures, existingBookings }, { status: 201 });
}
