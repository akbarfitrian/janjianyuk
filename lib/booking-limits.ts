// Batas-batas buat booking publik (endpoint tanpa login), supaya nggak gampang
// disalahgunakan: dipakai buat ngisi slot dengan booking palsu, atau bikin
// outlet ngirim WA ke nomor orang lain berkali-kali. Bagian murni (tanpa
// database) — aman diimpor dari komponen client. Pengecekan yang butuh
// database ada di lib/booking-abuse.ts.
//
// Semua angka di sini sengaja longgar: pelanggan asli (mis. bapak yang
// mesenin tiga anaknya) nggak boleh kena, yang dicegah cuma pola ekstrem.

import { addDaysToDateString } from "@/lib/schedule";

// Field jebakan (honeypot): di form disembunyikan dari orang, tapi bot yang
// ngisi semua kolom bakal ngisinya juga. Kalau terisi, request ditolak.
export const HONEYPOT_FIELD = "fax";

// Booking mendatang (pending/confirmed) yang boleh dipegang satu no. HP di
// satu outlet.
export const MAX_ACTIVE_BOOKINGS_PER_PHONE = 5;

// Booking baru dari satu no. HP dalam satu jam.
export const MAX_BOOKINGS_PER_PHONE_PER_HOUR = 4;

// Booking baru dari satu IP dalam satu jam di satu outlet. Agak longgar
// karena banyak pengguna seluler Indonesia berbagi satu IP (CGNAT).
export const MAX_BOOKINGS_PER_IP_PER_HOUR = 10;

export const RATE_WINDOW_MS = 60 * 60 * 1000;

// Seberapa jauh ke depan pelanggan boleh booking online.
export const MAX_ADVANCE_DAYS = 60;
export const ADVANCE_WINDOW_ERROR = `Booking online maksimal ${MAX_ADVANCE_DAYS} hari ke depan.`;

export const MAX_CUSTOMER_NAME_LENGTH = 100;

export function isWithinAdvanceWindow(dateStr: string, todayStr: string) {
  return dateStr <= addDaysToDateString(todayStr, MAX_ADVANCE_DAYS);
}
