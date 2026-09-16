import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

// Dipakai di semua API route Fase 1 (services, staff, customers, bookings)
// buat mastiin request punya session valid DAN scoped ke outletId dari
// session-nya sendiri — jangan pernah percaya outletId/outletSlug yang
// dikirim dari client.
export async function requireOutletSession() {
  const session = await auth();

  if (!session?.user?.outletId) {
    return {
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    } as const;
  }

  return {
    outletId: session.user.outletId,
    userId: session.user.id,
  } as const;
}
