// Hari tutup outlet (mingguan + tanggal khusus) dan cuti staff — bagian
// murni (tanpa database), aman diimpor dari komponen client. Query database-nya
// ada di lib/schedule-queries.ts.
//
// Semua tanggal di sini "YYYY-MM-DD" kalender WIB, disimpan sebagai string
// (bukan DateTime) biar nggak ada urusan timezone — hari dalam seminggu
// dihitung murni dari kalender lewat Date.UTC, jadi hasilnya sama di mana pun
// kode ini jalan (server Vercel = UTC, HP pelanggan, dst).

import { jakartaDateStringNow } from "@/lib/tz";

// Nomor hari = Date#getDay(): 0 = Minggu … 6 = Sabtu.
export const WEEKDAY_LABELS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

// Urutan tampil di form: minggu kerja dimulai Senin.
export const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const MAX_CLOSURE_RANGE_DAYS = 60;
export const MAX_REASON_LENGTH = 100;

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_FORMAT.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function weekdayOfDateString(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

// Dari-sampai (sampai boleh kosong = satu hari) jadi daftar tanggal. Nggak
// boleh di masa lalu, dan dibatasi biar satu request nggak bikin ribuan baris.
export function expandDateRange(
  startDate: unknown,
  endDate: unknown,
): { dates: string[] } | { error: string } {
  if (!isValidDateString(startDate)) {
    return { error: "Tanggal mulai tidak valid." };
  }
  const end = endDate === undefined || endDate === null || endDate === ""
    ? startDate
    : endDate;
  if (!isValidDateString(end)) {
    return { error: "Tanggal selesai tidak valid." };
  }
  if (end < startDate) {
    return { error: "Tanggal selesai nggak boleh sebelum tanggal mulai." };
  }
  if (startDate < jakartaDateStringNow()) {
    return { error: "Tanggal mulai nggak boleh sudah lewat." };
  }

  const dates: string[] = [];
  for (let d = startDate; d <= end; d = addDaysToDateString(d, 1)) {
    dates.push(d);
    if (dates.length > MAX_CLOSURE_RANGE_DAYS) {
      return {
        error: `Maksimal ${MAX_CLOSURE_RANGE_DAYS} hari sekali input.`,
      };
    }
  }
  return { dates };
}

export function parseReason(
  input: unknown,
): { value: string | null } | { error: string } {
  if (input === undefined || input === null) return { value: null };
  if (typeof input !== "string") return { error: "Alasan tidak valid." };
  const trimmed = input.trim();
  if (trimmed.length > MAX_REASON_LENGTH) {
    return { error: `Alasan maksimal ${MAX_REASON_LENGTH} karakter.` };
  }
  return { value: trimmed || null };
}

// Array nomor hari (0–6) dari input, dibersihkan: unik & terurut. null kalau
// bentuknya salah.
export function parseWeekdays(input: unknown): number[] | null {
  if (!Array.isArray(input)) return null;
  const days = new Set<number>();
  for (const item of input) {
    if (!Number.isInteger(item) || item < 0 || item > 6) return null;
    days.add(item);
  }
  return [...days].sort((a, b) => a - b);
}

// "Jumat" / "Senin dan Jumat" / "Senin, Selasa, dan Jumat" (urut Senin→Minggu).
export function formatClosedDaysLabel(weekdays: number[]): string | null {
  const names = WEEKDAY_DISPLAY_ORDER.filter((d) => weekdays.includes(d)).map(
    (d) => WEEKDAY_LABELS[d],
  );
  if (names.length === 0) return null;
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} dan ${names[names.length - 1]}`;
}
