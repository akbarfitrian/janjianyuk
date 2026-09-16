import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOutletSession } from "@/lib/api-session";

async function findOwnedService(id: string, outletId: string) {
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service || service.outletId !== outletId) return null;
  return service;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await findOwnedService(id, ctx.outletId);
  if (!existing) {
    return NextResponse.json(
      { error: "Layanan tidak ditemukan." },
      { status: 404 },
    );
  }

  const body = await request.json();
  const { name, durationMin, price } = body as {
    name?: string;
    durationMin?: number;
    price?: number;
  };

  if (durationMin !== undefined && durationMin <= 0) {
    return NextResponse.json(
      { error: "Durasi harus lebih dari 0." },
      { status: 400 },
    );
  }
  if (price !== undefined && price < 0) {
    return NextResponse.json(
      { error: "Harga tidak boleh negatif." },
      { status: 400 },
    );
  }

  const service = await prisma.service.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(durationMin !== undefined ? { durationMin } : {}),
      ...(price !== undefined ? { price } : {}),
    },
  });

  return NextResponse.json({ service });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await findOwnedService(id, ctx.outletId);
  if (!existing) {
    return NextResponse.json(
      { error: "Layanan tidak ditemukan." },
      { status: 404 },
    );
  }

  await prisma.service.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
