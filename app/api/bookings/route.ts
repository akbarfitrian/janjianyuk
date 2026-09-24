import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireActiveOutletSession } from "@/lib/api-session";
import { parseBookingNotes } from "@/lib/booking-notes";
import { SlotConflictError, isWriteConflict } from "@/lib/db-errors";
import { sendBookingConfirmation } from "@/lib/notifications";
import { endOfJakartaDay, jakartaDateStringNow, startOfJakartaDay } from "@/lib/tz";

const bookingInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  service: { select: { id: true, name: true, durationMin: true, price: true } },
  staff: { select: { id: true, name: true } },
  outlet: { select: { name: true } },
  packageSessionUsage: {
    select: {
      id: true,
      customerPackage: {
        select: { id: true, package: { select: { name: true } } },
      },
    },
  },
} as const;

export async function GET(request: Request) {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date"); // format YYYY-MM-DD

  const dateStr = dateParam ?? jakartaDateStringNow();
  const start = startOfJakartaDay(dateStr);
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
  }
  const end = endOfJakartaDay(dateStr);

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
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const { customerId, serviceId, staffId, startTime, notes } = body as {
    customerId?: string;
    serviceId?: string;
    staffId?: string | null;
    startTime?: string;
    notes?: unknown;
  };

  if (!customerId || !serviceId || !startTime) {
    return NextResponse.json(
      { error: "Pelanggan, layanan, dan waktu mulai wajib diisi." },
      { status: 400 },
    );
  }

  const parsedNotes = parseBookingNotes(notes);
  if ("error" in parsedNotes) {
    return NextResponse.json({ error: parsedNotes.error }, { status: 400 });
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
  if (!service.isActive) {
    return NextResponse.json(
      { error: "Layanan ini nonaktif. Aktifkan dulu di menu Layanan." },
      { status: 409 },
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

  // Cek bentrok & bikin booking dibungkus satu transaction Serializable,
  // sama alasannya kayak endpoint booking publik: sebelumnya cek bentrok
  // (findFirst) & insert (create) dua langkah terpisah, jadi dua submit yang
  // nyaris bareng (dua tab/device admin, atau bareng sama booking publik)
  // buat staff+jam yang sama bisa dua-duanya lolos. Dengan Serializable,
  // Postgres sendiri yang nolak salah satunya kalau itu kejadian — ditangkap
  // di catch di bawah dan tetap balik 409 yang sama kayak sebelumnya.
  let booking;
  try {
    booking = await prisma.$transaction(
      async (tx) => {
        if (staffId) {
          // Cek bentrok: booking lain punya staff yang sama, belum
          // batal/no-show, dan rentang waktunya overlap sama slot baru ini.
          const clash = await tx.booking.findFirst({
            where: {
              staffId,
              status: { notIn: ["cancelled", "no_show"] },
              startTime: { lt: end },
              endTime: { gt: start },
            },
          });
          if (clash) throw new SlotConflictError();
        }

        return tx.booking.create({
          data: {
            outletId: ctx.outletId,
            customerId,
            serviceId,
            staffId: staffId || null,
            startTime: start,
            endTime: end,
            status: "confirmed",
            notes: parsedNotes.value,
          },
          include: bookingInclude,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (err) {
    if (err instanceof SlotConflictError || isWriteConflict(err)) {
      return NextResponse.json(
        { error: "Staff ini sudah ada booking lain di jam tersebut." },
        { status: 409 },
      );
    }
    throw err;
  }

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
