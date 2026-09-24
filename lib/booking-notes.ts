// Catatan per kunjungan (Booking.notes), mis. "mau warnain merah", "rambut
// tebal, tolong pelan-pelan". Beda dari Customer.notes yang isinya info yang
// berlaku terus (alergi, preferensi tetap) dan diisi admin dari menu Pelanggan.
//
// Endpoint booking publik tanpa login, jadi panjangnya dibatasi.

export const BOOKING_NOTES_MAX_LENGTH = 500;

export function parseBookingNotes(
  input: unknown,
): { value: string | null } | { error: string } {
  if (input === undefined || input === null) return { value: null };
  if (typeof input !== "string") return { error: "Catatan tidak valid." };

  const trimmed = input.trim();
  if (trimmed.length > BOOKING_NOTES_MAX_LENGTH) {
    return {
      error: `Catatan maksimal ${BOOKING_NOTES_MAX_LENGTH} karakter.`,
    };
  }
  return { value: trimmed || null };
}
