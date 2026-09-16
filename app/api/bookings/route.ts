import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOutletSession } from "@/lib/api-session";
import { sendBookingConfirmation } from "@/lib/notifications";

const bookingInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  service: { select: { id: true, name: true, durationMin: true, price: true } },
  staff: { select: { id: true, name: true } },
  outlet: { select: { name: true } },
} as const;

export async function GET(request: Request) {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date"); // format YYYY-MM-DD

  const day = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date();
  if (Number.isNaN(day.getTime())) {
    return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
  }

  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const bookings = await prisma.booking.findMany({
    where: {
      outletId: ctx.outletId,
      startTime: { gte: start, lt: end },
    },
    include: bookingInclude,
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json({ bookings });
}

export async function POST(request: Request) {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const { customerId, serviceId, staffId, startTime } = body as {
    customerId?: string;
    serviceId?: string;
    staffId?: string | null;
    startTime?: string;
  };

  if (!customerId || !serviceId || !startTime) {
    return NextResponse.json(
      { error: "Pelanggan, layanan, dan waktu mulai wajib diisi." },
      { status: 400 },
    );
  }

  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json(
      { error: "Waktu mulai tidak valid." },
      { status: 400 },
    );
  }

  const [customer, service] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.service.findUnique({ where: { id: serviceId } }),
  ]);

  if (!customer || customer.outletId !== ctx.outletId) {
    return NextResponse.json(
      { error: "Pelanggan tidak ditemukan." },
      { status: 404 },
    );
  }
  if (!service || service.outletId !== ctx.outletId) {
    return NextResponse.json(
      { error: "Layanan tidak ditemukan." },
      { status: 404 },
    );
  }
  if (staffId) {
    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff || staff.outletId !== ctx.outletId) {
      return NextResponse.json(
        { error: "Staff tidak ditemukan." },
        { status: 404 },
      );
    }
  }

  const end = new Date(start.getTime() + service.durationMin * 60 * 1000);

  if (staffId) {
    // Cek bentrok: booking lain punya staff yang sama, belum batal/no-show,
    // dan rentang waktunya overlap sama slot baru ini.
    const clash = await prisma.booking.findFirst({
      where: {
        staffId,
        status: { notIn: ["cancelled", "no_show"] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });
    if (clash) {
      return NextResponse.json(
        { error: "Staff ini sudah ada booking lain di jam tersebut." },
        { status: 409 },
      );
    }
  }

  const booking = await prisma.booking.create({
    data: {
      outletId: ctx.outletId,
      customerId,
      serviceId,
      staffId: staffId || null,
      startTime: start,
      endTime: end,
      status: "confirmed",
    },
    include: bookingInclude,
  });

  // Booking dibuat manual sama admin/staff dari dashboard — tetap kirim
  // konfirmasi WA ke pelanggannya. Gagal kirim WA nggak boleh bikin
  // booking-nya sendiri gagal, jadi dibungkus try/catch.
  try {
    await sendBookingConfirmation(booking);
  } catch (err) {
    console.warn("[bookings] gagal kirim konfirmasi WA:", err);
  }

  return NextResponse.json({ booking }, { status: 201 });
}
