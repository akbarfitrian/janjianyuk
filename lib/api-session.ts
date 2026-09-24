import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getEffectiveAccess } from "@/lib/plan";

// Dipakai di semua API route Fase 1 (services, staff, customers, bookings)
// buat mastiin request punya session valid DAN scoped ke outletId dari
// session-nya sendiri — jangan pernah percaya outletId/outletSlug yang
// dikirim dari client.
//
// CATATAN: fungsi ini SENGAJA nggak cek plan/trial — dia dipakai apa adanya
// cuma di /api/billing/upgrade (jalan keluar dari locked, jadi harus tetap
// bisa dipanggil walau outlet-nya locked). Semua route dashboard lain pakai
// requireActiveOutletSession di bawah.
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

// Sama kayak requireOutletSession, plus cek plan (trial habis / nunggak /
// dibatalin => locked) pakai gate yang sama kayak dashboard
// (lib/plan.ts#getEffectiveAccess).
//
// AccessGate (components/access-gate.tsx) cuma ngeganti TAMPILAN dashboard
// jadi "Akses dikunci" — dia nggak pernah nge-block API route di baliknya.
// Tanpa cek ini, outlet yang locked tetap bisa CRUD penuh lewat panggilan
// API langsung (devtools/curl/dst), padahal dashboard-nya sendiri udah
// nunjukkin terkunci. Ini yang nutup celah itu — dipakai di SEMUA route
// dashboard KECUALI /api/billing/upgrade (lihat catatan di atas).
export async function requireActiveOutletSession() {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx;

  const outlet = await prisma.outlet.findUnique({
    where: { id: ctx.outletId },
    select: { planStatus: true, trialEndsAt: true },
  });

  // Outlet-nya nggak ketemu (harusnya nggak mungkin kalau session-nya
  // valid) diperlakukan sama kayak locked, bukan malah diloloskan.
  if (!outlet || getEffectiveAccess(outlet).access === "locked") {
    return {
      error: NextResponse.json(
        {
          error:
            "Trial habis atau langganan nggak aktif. Upgrade lewat halaman Tagihan buat lanjut pakai fitur ini.",
        },
        { status: 403 },
      ),
    } as const;
  }

  return ctx;
}
