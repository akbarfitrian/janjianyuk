// Satu-satunya tempat normalisasi & validasi no. HP pelanggan. Dipakai di API
// admin (app/api/customers), booking publik, wa-gateway, dan link wa.me di
// menu Paket — jangan bikin versi sendiri lagi di tempat lain.
//
// Format simpan: "628xxxxxxxxxx" (digit saja, tanpa "+" / spasi / strip).
// Ini format yang dibutuhin Fonnte, Wablas, dan wa.me, dan bikin no. yang
// sama selalu jadi string yang sama — penting karena booking publik nyari
// pelanggan lama lewat kecocokan persis (lihat Customer @@unique di schema).
//
// Cuma nomor seluler Indonesia yang diterima (628 + 7–11 digit). Kalau nanti
// perlu nomor luar negeri, longgarin regex di bawah — SQL di migration
// 20260921120000_customer_phone_unique harus disamain kalau ini berubah.

export const PHONE_ERROR =
  "No. HP tidak valid. Pakai nomor WhatsApp Indonesia, mis. 0812xxxxxxxx atau 62812xxxxxxxx.";

const ID_MOBILE = /^628\d{7,11}$/;

/**
 * "0812-3456-7890", "+62 812 3456 7890", "62812…", "812…" → "6281234567890".
 * Balikin null kalau bukan nomor seluler Indonesia yang valid.
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");

  digits = digits.replace(/^00/, ""); // awalan internasional "0062…"
  if (digits.startsWith("0")) {
    digits = `62${digits.slice(1)}`; // 0812… → 62812…
  } else if (digits.startsWith("8")) {
    digits = `62${digits}`; // 812… → 62812…
  }
  digits = digits.replace(/^620/, "62"); // "+62 0812…" (0 nyasar setelah kode negara)

  return ID_MOBILE.test(digits) ? digits : null;
}
