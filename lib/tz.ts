// Semua perhitungan "hari ini / jam berapa" di app ini harus lewat sini,
// BUKAN lewat `new Date()`, `.setHours()`, `.getDate()`, dsb secara langsung.
//
// Kenapa: method Date bawaan JS (`setHours`, `getFullYear`, `new Date(y, m, d)`,
// parsing string tanpa offset kayak `new Date("2026-01-01T00:00:00")`) semua
// diinterpretasi pakai timezone SERVER yang lagi jalanin proses — bukan
// timezone bisnisnya (Asia/Jakarta, WIB, UTC+7, nggak ada DST). Di laptop
// (biasanya TZ udah WIB) hasilnya kebetulan benar, tapi di Vercel (default
// UTC) semua batas hari/bulan geser 7 jam. Helper di sini eksplisit pakai
// offset +07:00 / Intl timeZone "Asia/Jakarta" supaya hasilnya SAMA di mana
// pun kode ini jalan.

const JAKARTA_OFFSET = "+07:00";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Awal hari (00:00 WIB) untuk tanggal "YYYY-MM-DD", sebagai instant absolut. */
export function startOfJakartaDay(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00${JAKARTA_OFFSET}`);
}

/** Awal hari berikutnya (00:00 WIB) — dipakai sebagai batas atas eksklusif. */
export function endOfJakartaDay(dateStr: string): Date {
  return new Date(startOfJakartaDay(dateStr).getTime() + DAY_MS);
}

/** Tanggal hari ini di WIB, format "YYYY-MM-DD" — bukan tanggal server. */
export function jakartaDateStringNow(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Ubah instant manapun jadi tanggal "YYYY-MM-DD" versi WIB (buat grouping laporan). */
export function toJakartaDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** { year, month } bulan berjalan di WIB (month 1-12, bukan 0-based). */
export function jakartaYearMonthNow(): { year: number; month: number } {
  const [year, month] = jakartaDateStringNow().split("-").map(Number);
  return { year, month };
}

/** Awal bulan (tanggal 1, 00:00 WIB) untuk year/month (month 1-12) yang dikasih. */
export function startOfJakartaMonth(year: number, month: number): Date {
  return startOfJakartaDay(`${year}-${String(month).padStart(2, "0")}-01`);
}

/** Awal bulan berikutnya di WIB — batas atas eksklusif buat query rentang bulan. */
export function endOfJakartaMonth(year: number, month: number): Date {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return startOfJakartaMonth(nextYear, nextMonth);
}
