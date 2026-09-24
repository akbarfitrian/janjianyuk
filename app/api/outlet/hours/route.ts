import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireActiveOutletSession } from "@/lib/api-session";
import { validateBusinessHours } from "@/lib/business-hours";

// Jam operasional itu kolom di model Outlet sendiri (bukan tabel
// terpisah kayak services/staff/dst), jadi GET/PATCH di sini baca-tulis
// langsung ke Outlet, di-scope ke outletId dari session.
export async function GET() {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const outlet = await prisma.outlet.findUnique({
    where: { id: ctx.outletId },
    select: {
      openTime: true,
      closeTime: true,
      breakStartTime: true,
      breakEndTime: true,
    },
  });

  if (!outlet) {
    return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ hours: outlet });
}

export async function PATCH(request: Request) {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const body = await request.json().catch(() => ({}));
  const { openTime, closeTime, breakStartTime, breakEndTime } = body as {
    openTime?: string;
    closeTime?: string;
    breakStartTime?: string | null;
    breakEndTime?: string | null;
  };

  if (!openTime || !closeTime) {
    return NextResponse.json(
      { error: "Jam buka dan jam tutup wajib diisi." },
      { status: 400 },
    );
  }

  const input = {
    openTime,
    closeTime,
    breakStartTime: breakStartTime || null,
    breakEndTime: breakEndTime || null,
  };

  const validationError = validateBusinessHours(input);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const outlet = await prisma.outlet.update({
    where: { id: ctx.outletId },
    data: input,
    select: {
      openTime: true,
      closeTime: true,
      breakStartTime: true,
      breakEndTime: true,
    },
  });

  return NextResponse.json({ hours: outlet });
}
