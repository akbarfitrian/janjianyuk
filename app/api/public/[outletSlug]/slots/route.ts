import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  findFreeStaffId,
  generateCandidateSlots,
  getBookingsForDay,
  isOutletFree,
  isStaffFree,
} from "@/lib/availability";
import { startOfJakartaDay } from "@/lib/tz";

// Endpoint publik (tanpa session) dipanggil dari halaman booking
// /booking/[outletSlug] buat nampilin jam kosong hari itu. Cuma balikin
// info yang aman buat publik: jam mulai + status kosong/penuh, nggak ada
// data booking pelanggan lain yang kebocor.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ outletSlug: string }> },
) {
  const { outletSlug } = await params;
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId");
  const staffId = searchParams.get("staffId"); // kosong/null = "staf manapun"
  const date = searchParams.get("date"); // format YYYY-MM-DD

  if (!serviceId || !date) {
    return NextResponse.json(
      { error: "serviceId dan date wajib diisi." },
      { status: 400 },
    );
  }
  if (Number.isNaN(startOfJakartaDay(date).getTime())) {
    return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
  }

  const outlet = await prisma.outlet.findUnique({
    where: { slug: outletSlug },
    select: {
      id: true,
      openTime: true,
      closeTime: true,
      breakStartTime: true,
      breakEndTime: true,
    },
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

  const allStaff = await prisma.staff.findMany({
    where: { outletId: outlet.id },
    select: { id: true },
  });
  const staffIds = allStaff.map((s) => s.id);

  const bookings = await getBookingsForDay(outlet.id, date);
  const candidates = generateCandidateSlots(date, service.durationMin, {
    openTime: outlet.openTime,
    closeTime: outlet.closeTime,
    breakStartTime: outlet.breakStartTime,
    breakEndTime: outlet.breakEndTime,
  });

  const slots = candidates.map((start) => {
    const end = new Date(start.getTime() + service.durationMin * 60 * 1000);

    let available: boolean;
    if (staffId) {
      available = isStaffFree(staffId, start, end, bookings);
    } else if (staffIds.length > 0) {
      available = findFreeStaffId(staffIds, start, end, bookings) !== null;
    } else {
      available = isOutletFree(start, end, bookings);
    }

    return { startTime: start.toISOString(), available };
  });

  return NextResponse.json({ slots });
}
