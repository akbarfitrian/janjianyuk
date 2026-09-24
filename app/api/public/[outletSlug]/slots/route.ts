import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  findFreeStaffId,
  generateCandidateSlots,
  getBookingsForDay,
  isOutletFree,
  isStaffFree,
  meetsMinLeadTime,
} from "@/lib/availability";
import { ADVANCE_WINDOW_ERROR, isWithinAdvanceWindow } from "@/lib/booking-limits";
import { getOutletDayStatus, getStaffOffIds } from "@/lib/schedule-queries";
import { jakartaDateStringNow, startOfJakartaDay } from "@/lib/tz";

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

  if (!isWithinAdvanceWindow(date, jakartaDateStringNow())) {
    return NextResponse.json({ slots: [], notice: ADVANCE_WINDOW_ERROR });
  }

  const outlet = await prisma.outlet.findUnique({
    where: { slug: outletSlug },
    select: {
      id: true,
      openTime: true,
      closeTime: true,
      breakStartTime: true,
      breakEndTime: true,
      closedWeekdays: true,
    },
  });
  if (!outlet) {
    return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });
  }

  // Outlet tutup di tanggal itu (hari tutup mingguan / tanggal libur): nggak
  // ada slot sama sekali, dan `notice` dipakai halaman publik buat ngasih
  // tahu alasannya — bukan cuma "nggak ada jam kosong".
  const dayStatus = await getOutletDayStatus(outlet, date);
  if (dayStatus.closed) {
    return NextResponse.json({ slots: [], notice: dayStatus.message });
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || service.outletId !== outlet.id || !service.isActive) {
    return NextResponse.json({ error: "Layanan tidak ditemukan." }, { status: 404 });
  }

  let requestedStaffName: string | null = null;
  if (staffId) {
    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff || staff.outletId !== outlet.id) {
      return NextResponse.json({ error: "Staff tidak ditemukan." }, { status: 404 });
    }
    requestedStaffName = staff.name;
  }

  const allStaff = await prisma.staff.findMany({
    where: { outletId: outlet.id },
    select: { id: true },
  });
  const staffIds = allStaff.map((s) => s.id);

  // Staff yang cuti di tanggal itu nggak ditawarkan. "Staf manapun" cuma
  // milih di antara yang masuk; kalau semua cuti, nggak ada slot.
  const staffOff = await getStaffOffIds(staffIds, date);
  const workingStaffIds = staffIds.filter((id) => !staffOff.has(id));

  if (staffId && staffOff.has(staffId)) {
    return NextResponse.json({
      slots: [],
      notice: `${requestedStaffName} libur di tanggal ini. Pilih staff atau tanggal lain.`,
    });
  }
  if (!staffId && staffIds.length > 0 && workingStaffIds.length === 0) {
    return NextResponse.json({
      slots: [],
      notice: "Semua staff libur di tanggal ini. Coba pilih tanggal lain.",
    });
  }

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
      available = findFreeStaffId(workingStaffIds, start, end, bookings) !== null;
    } else {
      available = isOutletFree(start, end, bookings);
    }

    // Jam yang sudah lewat / terlalu mepet tetap ditampilkan, tapi ditandai
    // penuh (sama kayak slot yang bentrok).
    return {
      startTime: start.toISOString(),
      available: available && meetsMinLeadTime(start),
    };
  });

  return NextResponse.json({ slots });
}
