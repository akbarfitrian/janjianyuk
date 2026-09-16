import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { sendBookingReminder } from "@/lib/notifications";

// Dipanggil Vercel Cron sekali sehari buat kirim reminder WA H-1 ke semua
// booking (semua outlet) yang jadwalnya besok. Endpoint ini global —
// nggak di-scope ke satu outlet — makanya proteksinya pakai CRON_SECRET,
// bukan session outlet.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startOfTomorrow = new Date();
  startOfTomorrow.setHours(0, 0, 0, 0);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const endOfTomorrow = new Date(startOfTomorrow);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);

  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ["pending", "confirmed"] },
      startTime: { gte: startOfTomorrow, lt: endOfTomorrow },
      // Jangan kirim reminder dobel kalau cron ini kepanggil lebih dari
      // sekali di hari yang sama (retry Vercel Cron, dsb).
      notifications: { none: { type: "reminder_h1", status: "sent" } },
    },
    include: {
      customer: { select: { name: true, phone: true } },
      service: { select: { name: true } },
      outlet: { select: { name: true } },
    },
  });

  let remindersSent = 0;
  let remindersFailed = 0;

  for (const booking of bookings) {
    const result = await sendBookingReminder(booking);
    if (result.success) {
      remindersSent += 1;
    } else {
      remindersFailed += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    bookingsChecked: bookings.length,
    remindersSent,
    remindersFailed,
  });
}
