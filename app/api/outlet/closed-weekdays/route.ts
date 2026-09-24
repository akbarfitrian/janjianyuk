import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireActiveOutletSession } from "@/lib/api-session";
import { parseWeekdays } from "@/lib/schedule";

// Hari tutup mingguan outlet (mis. tiap Jumat) — kolom Outlet.closedWeekdays.
export async function PATCH(request: Request) {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const body = await request.json().catch(() => ({}));
  const weekdays = parseWeekdays((body as { weekdays?: unknown }).weekdays);

  if (!weekdays) {
    return NextResponse.json(
      { error: "Hari tutup tidak valid." },
      { status: 400 },
    );
  }
  if (weekdays.length === 7) {
    return NextResponse.json(
      {
        error:
          "Minimal ada satu hari buka. Kalau mau tutup sementara, pakai Tanggal libur.",
      },
      { status: 400 },
    );
  }

  const outlet = await prisma.outlet.update({
    where: { id: ctx.outletId },
    data: { closedWeekdays: weekdays },
    select: { closedWeekdays: true },
  });

  return NextResponse.json({ closedWeekdays: outlet.closedWeekdays });
}
