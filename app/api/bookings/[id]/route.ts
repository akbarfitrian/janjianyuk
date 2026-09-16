import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOutletSession } from "@/lib/api-session";

const VALID_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
];

const bookingInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  service: { select: { id: true, name: true, durationMin: true, price: true } },
  staff: { select: { id: true, name: true } },
} as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing || existing.outletId !== ctx.outletId) {
    return NextResponse.json(
      { error: "Booking tidak ditemukan." },
      { status: 404 },
    );
  }

  const body = await request.json();
  const { status } = body as { status?: string };

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "Status tidak valid." },
      { status: 400 },
    );
  }

  const booking = await prisma.booking.update({
    where: { id },
    data: { status },
    include: bookingInclude,
  });

  return NextResponse.json({ booking });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing || existing.outletId !== ctx.outletId) {
    return NextResponse.json(
      { error: "Booking tidak ditemukan." },
      { status: 404 },
    );
  }

  await prisma.booking.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
