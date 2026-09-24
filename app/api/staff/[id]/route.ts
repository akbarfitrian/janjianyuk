import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireActiveOutletSession } from "@/lib/api-session";

async function findOwnedStaff(id: string, outletId: string) {
  const staff = await prisma.staff.findUnique({ where: { id } });
  if (!staff || staff.outletId !== outletId) return null;
  return staff;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await findOwnedStaff(id, ctx.outletId);
  if (!existing) {
    return NextResponse.json(
      { error: "Staff tidak ditemukan." },
      { status: 404 },
    );
  }

  const body = await request.json();
  const { name, email, phone, role } = body as {
    name?: string;
    email?: string;
    phone?: string | null;
    role?: string;
  };

  const staff = await prisma.staff.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(role !== undefined ? { role } : {}),
    },
  });

  return NextResponse.json({ staff });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await findOwnedStaff(id, ctx.outletId);
  if (!existing) {
    return NextResponse.json(
      { error: "Staff tidak ditemukan." },
      { status: 404 },
    );
  }

  // Booking yang udah assign ke staff ini dilepas (staffId jadi null)
  // biar histori booking-nya tetap ada, bukan ikut kehapus.
  await prisma.$transaction([
    prisma.booking.updateMany({
      where: { staffId: id },
      data: { staffId: null },
    }),
    prisma.staff.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
