// Query database buat hari tutup outlet & cuti staff. Dipisah dari
// lib/schedule.ts supaya komponen client bisa impor helper murninya tanpa
// ikut narik Prisma ke bundle browser.

import { prisma } from "@/lib/prisma";
import { WEEKDAY_LABELS, weekdayOfDateString } from "@/lib/schedule";

export type DayStatus = { closed: false } | { closed: true; message: string };

// Outlet buka di tanggal itu? Tutup kalau harinya masuk hari tutup mingguan
// atau tanggalnya terdaftar sebagai libur khusus.
export async function getOutletDayStatus(
  outlet: { id: string; closedWeekdays: number[] },
  dateStr: string,
): Promise<DayStatus> {
  const weekday = weekdayOfDateString(dateStr);
  if (outlet.closedWeekdays.includes(weekday)) {
    return {
      closed: true,
      message: `Outlet tutup setiap hari ${WEEKDAY_LABELS[weekday]}.`,
    };
  }

  const closure = await prisma.outletClosure.findUnique({
    where: { outletId_date: { outletId: outlet.id, date: dateStr } },
    select: { reason: true },
  });
  if (closure) {
    return {
      closed: true,
      message: closure.reason
        ? `Outlet libur di tanggal ini (${closure.reason}).`
        : "Outlet libur di tanggal ini.",
    };
  }

  return { closed: false };
}

// Id staff (dari daftar yang dikasih) yang cuti di tanggal itu.
export async function getStaffOffIds(
  staffIds: string[],
  dateStr: string,
): Promise<Set<string>> {
  if (staffIds.length === 0) return new Set();
  const rows = await prisma.staffTimeOff.findMany({
    where: { staffId: { in: staffIds }, date: dateStr },
    select: { staffId: true },
  });
  return new Set(rows.map((r) => r.staffId));
}
