import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  PUBLIC_BOOKING_MIN_LEAD_MIN,
  findFreeStaffId,
  getBookingsForDay,
  isOfferedSlot,
  isOutletFree,
  isStaffFree,
  meetsMinLeadTime,
} from "@/lib/availability";
import { sendBookingConfirmation } from "@/lib/notifications";
import { checkBookingRateLimits, getClientIpHash, recordPublicBooking } from "@/lib/booking-abuse";
import {
  ADVANCE_WINDOW_ERROR,
  HONEYPOT_FIELD,
  MAX_CUSTOMER_NAME_LENGTH,
  isWithinAdvanceWindow,
} from "@/lib/booking-limits";
import { parseBookingNotes } from "@/lib/booking-notes";
import { SlotConflictError, isUniqueViolation, isWriteConflict } from "@/lib/db-errors";
import { getEffectiveAccess } from "@/lib/plan";
import { PHONE_ERROR, normalizePhone } from "@/lib/phone";
import { getOutletDayStatus, getStaffOffIds } from "@/lib/schedule-queries";
import { jakartaDateStringNow, toJakartaDateString } from "@/lib/tz";

const bookingInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  service: { select: { id: true, name: true, durationMin: true, price: true } },
  staff: { select: { id: true, name: true } },
  outlet: { select: { name: true } },
} as const;

// Dipanggil dari halaman booking publik — tanpa session, jadi semua input
// divalidasi ulang dari nol (jangan pernah percaya slot yang "kelihatan
// kosong" di client masih beneran kosong pas request ini sampai).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ outletSlug: string }> },
) {
  const { outletSlug } = await params;
  // Endpoint ini publik: body bisa berisi apa saja, jadi bentuknya dicek
  // dulu sebelum dipakai (bukan cuma dipercaya sesuai tipe TypeScript).
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  // Honeypot: kolom ini disembunyikan di form. Orang nggak pernah ngisinya,
  // bot yang ngisi semua kolom iya.
  const honeypot = (body as Record<string, unknown>)[HONEYPOT_FIELD];
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { serviceId, staffId, startTime, customerName, customerPhone, notes } =
    body as {
      serviceId?: unknown;
      staffId?: unknown;
      startTime?: unknown;
      customerName?: unknown;
      customerPhone?: unknown;
      notes?: unknown;
    };

  if (
    typeof serviceId !== "string" ||
    typeof startTime !== "string" ||
    typeof customerName !== "string" ||
    typeof customerPhone !== "string" ||
    !serviceId ||
    !startTime ||
    !customerName.trim() ||
    !customerPhone.trim()
  ) {
    return NextResponse.json(
      { error: "Layanan, waktu, nama, dan no. HP wajib diisi." },
      { status: 400 },
    );
  }
  if (staffId !== undefined && staffId !== null && typeof staffId !== "string") {
    return NextResponse.json({ error: "Staff tidak valid." }, { status: 400 });
  }
  // Ditulis eksplisit ke variabel baru yang tipenya jelas (string | null),
  // bukan ngandelin TS ngelacak balik narrowing guard di atas pas dipakai di
  // dalam closure transaction booking di bawah — closure kadang nggak
  // mewarisi narrowing itu.
  const staffIdInput: string | null = typeof staffId === "string" ? staffId : null;

  const cleanName = customerName.trim();
  if (cleanName.length > MAX_CUSTOMER_NAME_LENGTH) {
    return NextResponse.json(
      { error: `Nama maksimal ${MAX_CUSTOMER_NAME_LENGTH} karakter.` },
      { status: 400 },
    );
  }

  const phone = normalizePhone(customerPhone);
  if (!phone) {
    return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
  }

  const parsedNotes = parseBookingNotes(notes);
  if ("error" in parsedNotes) {
    return NextResponse.json({ error: parsedNotes.error }, { status: 400 });
  }

  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: "Waktu mulai tidak valid." }, { status: 400 });
  }
  if (start.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Nggak bisa booking di jam yang udah lewat." },
      { status: 400 },
    );
  }
  if (!isWithinAdvanceWindow(toJakartaDateString(start), jakartaDateStringNow())) {
    return NextResponse.json({ error: ADVANCE_WINDOW_ERROR }, { status: 400 });
  }
  if (!meetsMinLeadTime(start)) {
    return NextResponse.json(
      {
        error: `Booking online minimal ${PUBLIC_BOOKING_MIN_LEAD_MIN} menit sebelum jam mulai. Pilih jam lain ya.`,
      },
      { status: 400 },
    );
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
      planStatus: true,
      trialEndsAt: true,
    },
  });
  if (!outlet) {
    return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });
  }

  // Sama kayak gate di dashboard (lib/plan.ts) — trial habis / langganan
  // nunggak / dibatalin nggak boleh tetap bisa nerima booking baru dari
  // publik cuma karena endpoint ini nggak pernah dicek plan-nya. Booking
  // yang UDAH ada sebelum outlet locked tetap jalan normal (reminder H-1
  // dst) — ini cuma nutup pembuatan booking BARU selama locked.
  if (getEffectiveAccess(outlet).access === "locked") {
    return NextResponse.json(
      {
        error:
          "Outlet ini lagi nggak bisa nerima booking online. Coba hubungi outlet langsung ya.",
      },
      { status: 403 },
    );
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || service.outletId !== outlet.id) {
    return NextResponse.json({ error: "Layanan tidak ditemukan." }, { status: 404 });
  }
  if (!service.isActive) {
    // Halaman booking bisa aja masih kebuka di HP pelanggan pas layanannya
    // baru dinonaktifkan owner.
    return NextResponse.json(
      { error: "Layanan ini sudah nggak tersedia. Muat ulang halaman ya." },
      { status: 409 },
    );
  }

  let requestedStaffName = "";
  if (staffIdInput) {
    const staff = await prisma.staff.findUnique({ where: { id: staffIdInput } });
    if (!staff || staff.outletId !== outlet.id) {
      return NextResponse.json({ error: "Staff tidak ditemukan." }, { status: 404 });
    }
    requestedStaffName = staff.name;
  }

  // Jam harus salah satu yang memang ditawarkan /slots (dalam jam operasional,
  // bukan jam istirahat, sejajar grid, selesai sebelum tutup) — endpoint ini
  // publik, jadi request buatan sendiri nggak boleh bisa booking jam 03.00.
  if (!isOfferedSlot(start, service.durationMin, outlet)) {
    return NextResponse.json(
      {
        error:
          "Jam itu di luar jam operasional outlet. Muat ulang halaman dan pilih jam yang tersedia.",
      },
      { status: 400 },
    );
  }

  // Outlet tutup (hari tutup mingguan / tanggal libur) — /slots memang nggak
  // nawarin jam apa pun di hari itu, tapi request buatan sendiri tetap dicek.
  const dateStr = toJakartaDateString(start);
  const dayStatus = await getOutletDayStatus(outlet, dateStr);
  if (dayStatus.closed) {
    return NextResponse.json({ error: dayStatus.message }, { status: 400 });
  }

  // Batas spam: per nomor HP (booking mendatang & laju per jam) dan per IP.
  // Dicek sebelum ada pelanggan/booking yang dibuat, jadi request yang
  // ditolak nggak ninggalin apa-apa.
  const ipHash = getClientIpHash(request);
  const limited = await checkBookingRateLimits({
    outletId: outlet.id,
    phone,
    ipHash,
  });
  if (limited) {
    return NextResponse.json({ error: limited.error }, { status: 429 });
  }

  const end = new Date(start.getTime() + service.durationMin * 60 * 1000);

  // Staff cuti & "outlet nggak punya staff sama sekali" dicek di sini —
  // datanya nggak berubah dalam hitungan milidetik, beda sama cek bentrok
  // jadwal yang sebenarnya rawan race condition kalau dua orang klik bareng.
  // Itu makanya cek bentroknya (isStaffFree/findFreeStaffId/isOutletFree)
  // dipindah ke dalam transaction Serializable di bawah, bareng booking.create.
  let workingStaffIds: string[] | null = null; // null = staffIdInput dipilih spesifik
  let outletHasNoStaff = false;
  if (staffIdInput) {
    const staffOff = await getStaffOffIds([staffIdInput], dateStr);
    if (staffOff.has(staffIdInput)) {
      return NextResponse.json(
        {
          error: `${requestedStaffName} libur di tanggal itu. Pilih staff atau tanggal lain.`,
        },
        { status: 400 },
      );
    }
  } else {
    const allStaff = await prisma.staff.findMany({
      where: { outletId: outlet.id },
      select: { id: true },
    });

    if (allStaff.length > 0) {
      // "Staf manapun" cuma dipilih di antara staff yang masuk hari itu.
      const staffOff = await getStaffOffIds(
        allStaff.map((s) => s.id),
        dateStr,
      );
      workingStaffIds = allStaff
        .map((s) => s.id)
        .filter((id) => !staffOff.has(id));
      if (workingStaffIds.length === 0) {
        return NextResponse.json(
          { error: "Semua staff libur di tanggal itu. Coba pilih tanggal lain." },
          { status: 400 },
        );
      }
    } else {
      outletHasNoStaff = true;
    }
  }

  // Cari pelanggan lama berdasarkan no. HP (sudah dinormalisasi ke 628…) di
  // outlet yang sama, biar riwayat booking-nya nyambung — kalau belum ada,
  // baru bikin baru. Unique (outletId, phone) di schema yang jaga nggak ada
  // dobel; kalau dua request barengan sama-sama lolos cek, yang kalah ambil
  // baris yang baru dibuat pemenangnya.
  const customerKey = { outletId_phone: { outletId: outlet.id, phone } };
  let customer = await prisma.customer.findUnique({ where: customerKey });
  if (!customer) {
    try {
      customer = await prisma.customer.create({
        data: {
          outletId: outlet.id,
          name: cleanName,
          phone,
        },
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      customer = await prisma.customer.findUnique({ where: customerKey });
      if (!customer) throw err;
    }
  }

  // Cek bentrok jadwal & bikin booking dibungkus satu transaction Serializable:
  // baca booking hari itu + tulis booking baru diperlakukan Postgres sebagai
  // satu unit. Sebelumnya baca (getBookingsForDay) & tulis (booking.create)
  // ini dua langkah terpisah, jadi dua request yang klik nyaris bareng buat
  // slot yang sama bisa dua-duanya lolos cek "kosong" terus dua-duanya
  // berhasil insert (double booking). Dengan Serializable, kalau itu
  // kejadian, Postgres sendiri yang nolak salah satunya — ditangkap di catch
  // di bawah dan tetap balik 409 yang sama kayak sebelumnya, bukan error 500.
  let booking;
  try {
    booking = await prisma.$transaction(
      async (tx) => {
        const bookings = await getBookingsForDay(outlet.id, dateStr, tx);

        let assignedStaffId: string | null = null;
        if (staffIdInput) {
          if (!isStaffFree(staffIdInput, start, end, bookings)) {
            throw new SlotConflictError();
          }
          assignedStaffId = staffIdInput;
        } else if (workingStaffIds) {
          const freeStaffId = findFreeStaffId(workingStaffIds, start, end, bookings);
          if (!freeStaffId) throw new SlotConflictError();
          assignedStaffId = freeStaffId;
        } else if (outletHasNoStaff && !isOutletFree(start, end, bookings)) {
          throw new SlotConflictError();
        }

        // Booking dari pelanggan sendiri masih perlu direview outlet, beda
        // sama input admin yang langsung "confirmed" — makanya status
        // default "pending" di schema.prisma dipakai apa adanya di sini.
        return tx.booking.create({
          data: {
            outletId: outlet.id,
            customerId: customer.id,
            serviceId,
            staffId: assignedStaffId,
            startTime: start,
            endTime: end,
            status: "pending",
            // Catatan form publik itu buat kunjungan ini, bukan info tetap
            // pelanggan — makanya masuk ke Booking, bukan Customer.notes.
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
        { error: "Slot ini baru aja kepakai, coba pilih jam lain ya." },
        { status: 409 },
      );
    }
    throw err;
  }

  await recordPublicBooking(outlet.id, ipHash);

  // Gagal kirim WA nggak boleh menggagalkan booking, tapi client perlu tahu
  // supaya layar suksesnya nggak bilang "konfirmasi udah dikirim" padahal
  // belum (token gateway kosong, nomor nggak aktif di WA, dsb).
  let notified = false;
  try {
    const result = await sendBookingConfirmation(booking);
    notified = result.success;
  } catch (err) {
    console.warn("[public bookings] gagal kirim konfirmasi WA:", err);
  }

  return NextResponse.json({ booking, notified }, { status: 201 });
}
