import { getCurrentUser } from "@/lib/session";

/**
 * Ambil outletId dari sesi login, bukan dari form/URL, supaya server action
 * nggak bisa dipakai buat baca/tulis data outlet lain walau outletSlug di
 * URL diubah manual. Semua server action CRUD di Fase 1 wajib pakai ini
 * sebagai satu-satunya sumber outletId.
 */
export async function requireOutletId(): Promise<string> {
  const user = await getCurrentUser();
  const outletId = user?.outletId;

  if (!outletId) {
    throw new Error("Unauthorized");
  }

  return outletId;
}
