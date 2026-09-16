import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { findFreeStaffId, getBookingsForDay, isOutletFree, isStaffFree } from "@/lib/availability";
import { sendBookingConfirmation } from "@/lib/notifications";

const bookingInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  service: { select: { id: true, name: true, durationMin: true, price: true } },
  staff: { select: { id: true, name: true } },
  outlet: { select: { name: true } },
} as const;

function toDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Dipanggil dari halaman booking publik — tanpa session, jadi semua input
// divalidasi ulang dari nol (jangan pernah percaya slot yang "kelihatan
// kosong" di client masih beneran kosong pas request ini sampai).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ outletSlug: string }> },
) {
  const { outletSlug } = await params;
  const body = await request.json();
  const { serviceId, staffId, startTime, customerName, customerPhone, notes } =
    body as {
      serviceId?: string;
      staffId?: string | null;
      startTime?: string;
      customerName?: string;
      customerPhone?: string;
      notes?: string;
    };

  if (!serviceId || !startTime || !customerName || !customerPhone) {
    return NextResponse.json(
      { error: "Layanan, waktu, nama, dan no. HP wajib diisi." },
      { status: 400 },
    );
  }

  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: "Waktu mulai tidak valid." }, { status: 400 });
  }
  if (start.getTime() < Date.now() - 60_000) {
    return NextResponse.json(
      { error: "Nggak bisa booking di jam yang udah lewat." },
      { status: 400 },
    );
  }

  const outlet = await prisma.outlet.findUnique({
    where: { slug: outletSlug },
    select: { id: true },
  });
  if (!outlet) {
    return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || service.outletId !== outlet.id) {
    return NextResponse.json({ error: "Layanan tidak ditemukan." }, { status: 404 });
  }

  if (staffId) {
    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff || staff.outletId !== outlet.id) {
      return NextResponse.json({ error: "Staff tidak ditemukan." }, { status: 404 });
    }
  }

  const end = new Date(start.getTime() + service.durationMin * 60 * 1000);

  // Validasi bentrok ulang di server, sama logikanya kayak endpoint /slots
  // — jangan cuma percaya pilihan client.
  const bookings = await getBookingsForDay(outlet.id, toDateStr(start));

  let assignedStaffId: string | null = null;
  if (staffId) {
    if (!isStaffFree(staffId, start, end, bookings)) {
      return NextResponse.json(
        { error: "Slot ini baru aja kepakai, coba pilih jam lain ya." },
        { status: 409 },
      );
    }
    assignedStaffId = staffId;
  } else {
    const allStaff = await prisma.staff.findMany({
      where: { outletId: outlet.id },
      select: { id: true },
    });

    if (allStaff.length > 0) {
      const freeStaffId = findFreeStaffId(
        allStaff.map((s) => s.id),
        start,
        end,
        bookings,
      );
      if (!freeStaffId) {
        return NextResponse.json(
          { error: "Slot ini baru aja kepakai, coba pilih jam lain ya." },
          { status: 409 },
        );
      }
      assignedStaffId = freeStaffId;
    } else if (!isOutletFree(start, end, bookings)) {
      return NextResponse.json(
        { error: "Slot ini baru aja kepakai, coba pilih jam lain ya." },
        { status: 409 },
      );
    }
  }

  // Cari pelanggan lama berdasarkan no. HP di outlet yang sama, biar
  // riwayat booking-nya nyambung — kalau belum ada, baru bikin baru.
  let customer = await prisma.customer.findFirst({
    where: { outletId: outlet.id, phone: customerPhone },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        outletId: outlet.id,
        name: customerName,
        phone: customerPhone,
        notes: notes || null,
      },
    });
  }

  // Booking dari pelanggan sendiri masih perlu direview outlet, beda sama
  // input admin yang langsung "confirmed" — makanya status default
  // "pending" di schema.prisma dipakai apa adanya di sini.
  const booking = await prisma.booking.create({
    data: {
      outletId: outlet.id,
      customerId: customer.id,
      serviceId,
      staffId: assignedStaffId,
      startTime: start,
      endTime: end,
      status: "pending",
    },
    include: bookingInclude,
  });

  try {
    await sendBookingConfirmation(booking);
  } catch (err) {
    console.warn("[public bookings] gagal kirim konfirmasi WA:", err);
  }

  return NextResponse.json({ booking }, { status: 201 });
}
