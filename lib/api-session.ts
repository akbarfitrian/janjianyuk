import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/session";

// Dipakai di semua API route Fase 1 (services, staff, customers, bookings)
// buat mastiin request punya session valid DAN scoped ke outletId dari
// session-nya sendiri — jangan pernah percaya outletId/outletSlug yang
// dikirim dari client.
export async function requireOutletSession() {
  const user = await getCurrentUser();

  if (!user?.outletId) {
    return {
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    } as const;
  }

  return {
    outletId: user.outletId,
    userId: user.id,
  } as const;
}
