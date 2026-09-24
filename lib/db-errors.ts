// Deteksi error Prisma lewat kode-nya (bukan instanceof) biar tetap jalan
// lewat driver adapter & nggak bergantung ke path import class error-nya.

function prismaCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

// P2002 — melanggar unique constraint (mis. no. HP kembar di satu outlet).
export function isUniqueViolation(err: unknown) {
  return prismaCode(err) === "P2002";
}

// P2003 — melanggar foreign key (mis. hapus baris yang masih dirujuk tabel lain).
export function isForeignKeyViolation(err: unknown) {
  return prismaCode(err) === "P2003";
}

// Serialization failure Postgres (kode asli 40001, kadang 40P01 buat
// deadlock) pas dua transaction Serializable rebutan baris yang sama. Dipakai
// di transaction booking (app/api/bookings & app/api/public/[outletSlug]/
// bookings): ini bukan error tak terduga, ini justru DB yang berhasil nyegah
// dua booking bentrok masuk bareng. Sisi yang "kalah" harus dianggap slot
// udah kepakai, bukan 500.
//
// Bentuknya beda-beda tergantung cara Prisma jalan:
// - Lewat query engine bawaan: dibungkus PrismaClientKnownRequestError,
//   err.code === "P2034".
// - Lewat driver adapter (proyek ini pakai adapter `pg` langsung — lihat
//   warning "client.query()" di log dev): dilempar sebagai DriverAdapterError
//   MENTAH, nggak pernah dipetakan ke P2034. Kode aslinya nyempil di
//   err.cause.originalCode / err.cause.kind, bukan err.code. Kalau cuma cek
//   P2034 kayak sebelumnya, jalur ini lolos ke `throw err` di route dan jadi
//   500 tanpa body JSON (itu yang bikin res.json() di client meledak).
function driverAdapterOriginalCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const cause = (err as { cause?: unknown }).cause;
  if (typeof cause !== "object" || cause === null) return undefined;
  const code = (cause as { originalCode?: unknown }).originalCode;
  return typeof code === "string" ? code : undefined;
}

export function isWriteConflict(err: unknown) {
  return (
    prismaCode(err) === "P2034" ||
    ["40001", "40P01"].includes(driverAdapterOriginalCode(err) ?? "")
  );
}

// Penanda internal buat dilempar di dalam transaction booking begitu cek
// ulang bentrok (isStaffFree/findFreeStaffId/isOutletFree, atau clash query
// admin) ketemu slotnya udah kepakai. Ditangkap di luar transaction dan
// diubah jadi response 409 yang sama kayak sebelum ada transaction ini.
export class SlotConflictError extends Error {}
