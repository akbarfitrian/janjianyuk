import { auth } from "@/lib/auth";

/**
 * Ambil outletId dari sesi login, bukan dari form/URL, supaya server action
 * nggak bisa dipakai buat baca/tulis data outlet lain walau outletSlug di
 * URL diubah manual. Semua server action CRUD di Fase 1 wajib pakai ini
 * sebagai satu-satunya sumber outletId.
 */
export async function requireOutletId(): Promise<string> {
  const session = await auth();
  const outletId = session?.user?.outletId;

  if (!outletId) {
    throw new Error("Unauthorized");
  }

  return outletId;
}
