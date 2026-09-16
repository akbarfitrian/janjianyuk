// Jam operasional dipakai buat generate slot booking publik. Belum ada
// pengaturan jam buka/tutup per outlet di schema (Outlet cuma punya kolom
// identitas & billing) — jadi buat sekarang flat berlaku buat semua outlet.
// Kalau nanti perlu custom per outlet, tinggal tambah kolom di model Outlet
// dan baca dari situ di tempat konstanta ini dipakai.
export const OPENING_HOUR = 9; // 09:00
export const CLOSING_HOUR = 18; // 18:00
export const SLOT_STEP_MIN = 30; // slot ditawarkan tiap 30 menit
