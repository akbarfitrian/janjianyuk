import { prisma } from "@/lib/prisma";
import { CLOSING_HOUR, OPENING_HOUR, SLOT_STEP_MIN } from "@/lib/business-hours";

// Status booking yang dianggap "masih pakai slot" — cancelled & no_show
// nggak lagi ngeblok jam yang sama, sama kayak clash check admin di
// app/api/bookings/route.ts (Fase 1).
const BLOCKING_STATUSES = ["pending", "confirmed", "completed"];

export type BookingSlot = {
  id: string;
  staffId: string | null;
  startTime: Date;
  endTime: Date;
};

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

// Rentang satu hari kalender (00:00–24:00) buat tanggal yang dikasih,
// dipakai buat query booking existing di hari itu.
export function dayRange(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

// Ambil semua booking outlet di hari itu yang masih "aktif" (belum
// cancelled/no_show), dipakai buat cek bentrok.
export async function getBookingsForDay(
  outletId: string,
  dateStr: string,
): Promise<BookingSlot[]> {
  const { start, end } = dayRange(dateStr);

  return prisma.booking.findMany({
    where: {
      outletId,
      status: { in: BLOCKING_STATUSES },
      startTime: { lt: end },
      endTime: { gt: start },
    },
    select: { id: true, staffId: true, startTime: true, endTime: true },
  });
}

// Generate kandidat jam mulai di hari itu, dari jam buka sampai jam tutup
// dikurangi durasi layanan (biar treatment-nya selesai sebelum tutup).
export function generateCandidateSlots(dateStr: string, durationMin: number) {
  const { start: dayStart } = dayRange(dateStr);
  const slots: Date[] = [];

  const openMinutes = OPENING_HOUR * 60;
  const closeMinutes = CLOSING_HOUR * 60;

  for (
    let minutes = openMinutes;
    minutes + durationMin <= closeMinutes;
    minutes += SLOT_STEP_MIN
  ) {
    const slotStart = new Date(dayStart);
    slotStart.setMinutes(minutes);
    slots.push(slotStart);
  }

  return slots;
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
