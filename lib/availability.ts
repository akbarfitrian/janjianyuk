import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";
import { SLOT_STEP_MIN, timeToMinutes, type OutletHours } from "@/lib/business-hours";
import { endOfJakartaDay, startOfJakartaDay, toJakartaDateString } from "@/lib/tz";

// Client biasa (prisma) atau client di dalam interactive transaction (tx) —
// keduanya punya method query yang sama, cuma beda konteks transaction-nya.
type QueryClient = PrismaClient | Prisma.TransactionClient;

// Status booking yang dianggap "masih pakai slot" — cancelled & no_show
// nggak lagi ngeblok jam yang sama, sama kayak clash check admin di
// app/api/bookings/route.ts (Fase 1).
const BLOCKING_STATUSES = ["pending", "confirmed", "completed"];

// Booking online minimal segini menit sebelum jam mulai — biar outlet sempat
// lihat & siap-siap, dan slot yang sudah lewat / mepet nggak kelihatan
// tersedia di halaman publik. Dipakai bareng oleh /slots (tampilan) dan POST
// booking publik (penjaga di server), jadi angkanya cukup diubah di sini.
export const PUBLIC_BOOKING_MIN_LEAD_MIN = 30;

export function meetsMinLeadTime(start: Date, nowMs: number = Date.now()) {
  return start.getTime() >= nowMs + PUBLIC_BOOKING_MIN_LEAD_MIN * 60_000;
}

export type BookingSlot = {
  id: string;
  staffId: string | null;
  startTime: Date;
  endTime: Date;
};

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

// Rentang satu hari kalender (00:00–24:00 WIB) buat tanggal yang dikasih,
// dipakai buat query booking existing di hari itu. Eksplisit WIB (bukan
// timezone server) — lihat lib/tz.ts buat alasannya.
export function dayRange(dateStr: string) {
  return { start: startOfJakartaDay(dateStr), end: endOfJakartaDay(dateStr) };
}

// Ambil semua booking outlet di hari itu yang masih "aktif" (belum
// cancelled/no_show), dipakai buat cek bentrok.
export async function getBookingsForDay(
  outletId: string,
  dateStr: string,
  db: QueryClient = prisma,
): Promise<BookingSlot[]> {
  const { start, end } = dayRange(dateStr);

  return db.booking.findMany({
    where: {
      outletId,
      status: { in: BLOCKING_STATUSES },
      startTime: { lt: end },
      endTime: { gt: start },
    },
    select: { id: true, staffId: true, startTime: true, endTime: true },
  });
}

// Generate kandidat jam mulai di hari itu, dari jam buka outlet sampai jam
// tutup dikurangi durasi layanan (biar treatment-nya selesai sebelum
// tutup). Slot yang overlap jam istirahat outlet dilewatin — istirahat
// berlaku buat outlet secara keseluruhan (semua staff sekaligus), beda dari
// cek bentrok booking per-staff/per-outlet di bawah yang jalan terpisah.
export function generateCandidateSlots(
  dateStr: string,
  durationMin: number,
  hours: OutletHours,
) {
  const { start: dayStart } = dayRange(dateStr);
  const slots: Date[] = [];

  const openMinutes = timeToMinutes(hours.openTime);
  const closeMinutes = timeToMinutes(hours.closeTime);
  const breakStart = hours.breakStartTime ? timeToMinutes(hours.breakStartTime) : null;
  const breakEnd = hours.breakEndTime ? timeToMinutes(hours.breakEndTime) : null;

  for (
    let minutes = openMinutes;
    minutes + durationMin <= closeMinutes;
    minutes += SLOT_STEP_MIN
  ) {
    const slotEndMinutes = minutes + durationMin;
    const overlapsBreak =
      breakStart !== null &&
      breakEnd !== null &&
      minutes < breakEnd &&
      slotEndMinutes > breakStart;

    if (overlapsBreak) continue;

    // Tambah milidetik langsung ke instant dayStart (bukan .setMinutes(),
    // yang baca/tulis wall-clock lokal server) — biar hasilnya konsisten
    // di mana pun kode ini jalan.
    slots.push(new Date(dayStart.getTime() + minutes * 60_000));
  }

  return slots;
}

// True kalau `start` persis salah satu jam yang ditawarkan halaman publik
// (/slots) buat layanan berdurasi segini: di dalam jam operasional, di luar
// jam istirahat, sejajar grid SLOT_STEP_MIN, dan selesai sebelum tutup. POST
// booking publik tanpa login, jadi server nggak boleh cuma percaya jam yang
// dikirim client.
export function isOfferedSlot(
  start: Date,
  durationMin: number,
  hours: OutletHours,
) {
  const dateStr = toJakartaDateString(start);
  return generateCandidateSlots(dateStr, durationMin, hours).some(
    (candidate) => candidate.getTime() === start.getTime(),
  );
}

// Slot dianggap bentrok buat staff tertentu kalau ada booking aktif staff
// itu yang rentang waktunya overlap.
export function isStaffFree(
  staffId: string,
  start: Date,
  end: Date,
  bookings: BookingSlot[],
) {
  return !bookings.some(
    (b) => b.staffId === staffId && overlaps(start, end, b.startTime, b.endTime),
  );
}

// Kalau customer nggak milih staff tertentu ("staf manapun"), cari staff
// pertama yang kosong di jam itu — biar tetap otomatis ke-assign tanpa
// nabrak staff lain yang udah ada booking.
export function findFreeStaffId(
  staffIds: string[],
  start: Date,
  end: Date,
  bookings: BookingSlot[],
): string | null {
  for (const staffId of staffIds) {
    if (isStaffFree(staffId, start, end, bookings)) return staffId;
  }
  return null;
}

// Outlet tanpa staff sama sekali (solo owner) diperlakukan sebagai satu
// resource tunggal — booking apa pun (staffId null atau bukan) di jam yang
// overlap dianggap ngeblok slot itu.
export function isOutletFree(start: Date, end: Date, bookings: BookingSlot[]) {
  return !bookings.some((b) => overlaps(start, end, b.startTime, b.endTime));
}
