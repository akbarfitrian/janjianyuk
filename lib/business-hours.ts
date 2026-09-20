// Jam operasional diatur sendiri per outlet — kolom di model Outlet
// (openTime, closeTime, breakStartTime, breakEndTime), lihat migrasi
// 20260918093000_outlet_business_hours. Semua disimpan sebagai string
// "HH:mm" (WIB) biar gampang dicocokin ke <input type="time"> di form
// settings dan gampang dibaca langsung dari database. breakStartTime /
// breakEndTime null artinya outlet itu nggak ambil jam istirahat.
export const DEFAULT_OPEN_TIME = "09:00";
export const DEFAULT_CLOSE_TIME = "18:00";
export const SLOT_STEP_MIN = 30; // slot ditawarkan tiap 30 menit — masih flat, semua outlet sama

export type OutletHours = {
  openTime: string;
  closeTime: string;
  breakStartTime: string | null;
  breakEndTime: string | null;
};

const TIME_FORMAT = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTimeString(value: string): boolean {
  return TIME_FORMAT.test(value);
}

// Ubah "HH:mm" jadi menit sejak 00:00 — dipakai buat perhitungan slot di
// lib/availability.ts. Asumsi input udah lolos isValidTimeString.
export function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

// Label buat ditampilin ke pelanggan di halaman booking publik, mis.
// "09:00–18:00 (istirahat 12:00–13:00)".
export function formatHoursLabel(hours: OutletHours): string {
  const base = `${hours.openTime}\u2013${hours.closeTime}`;
  if (hours.breakStartTime && hours.breakEndTime) {
    return `${base} (istirahat ${hours.breakStartTime}\u2013${hours.breakEndTime})`;
  }
  return base;
}

// Validasi input form/API buat update jam operasional outlet. Dipakai di
// app/api/outlet/hours/route.ts sebelum nulis ke database — nggak divalidasi
// di level schema karena aturannya (tutup > buka, istirahat di dalam jam
// operasional, dst) lintas kolom.
export function validateBusinessHours(input: OutletHours): string | null {
  if (!isValidTimeString(input.openTime) || !isValidTimeString(input.closeTime)) {
    return "Format jam buka/tutup tidak valid.";
  }

  const open = timeToMinutes(input.openTime);
  const close = timeToMinutes(input.closeTime);
  if (close <= open) {
    return "Jam tutup harus lebih besar dari jam buka.";
  }

  const hasBreakStart = input.breakStartTime !== null;
  const hasBreakEnd = input.breakEndTime !== null;
  if (hasBreakStart !== hasBreakEnd) {
    return "Jam mulai dan selesai istirahat harus diisi berdua, atau dikosongkan berdua kalau outlet nggak ambil istirahat.";
  }

  if (input.breakStartTime && input.breakEndTime) {
    if (
      !isValidTimeString(input.breakStartTime) ||
      !isValidTimeString(input.breakEndTime)
    ) {
      return "Format jam istirahat tidak valid.";
    }

    const breakStart = timeToMinutes(input.breakStartTime);
    const breakEnd = timeToMinutes(input.breakEndTime);
    if (breakEnd <= breakStart) {
      return "Jam selesai istirahat harus lebih besar dari jam mulai istirahat.";
    }
    if (breakStart < open || breakEnd > close) {
      return "Jam istirahat harus berada di dalam jam operasional.";
    }
  }

  return null;
}
