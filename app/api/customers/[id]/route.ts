import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOutletSession } from "@/lib/api-session";

async function findOwnedCustomer(id: string, outletId: string) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer || customer.outletId !== outletId) return null;
  return customer;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await findOwnedCustomer(id, ctx.outletId);
  if (!existing) {
    return NextResponse.json(
      { error: "Pelanggan tidak ditemukan." },
      { status: 404 },
    );
  }

  const body = await request.json();
  const { name, phone, notes } = body as {
    name?: string;
    phone?: string;
    notes?: string | null;
  };

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
  });

  return NextResponse.json({ customer });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await findOwnedCustomer(id, ctx.outletId);
  if (!existing) {
    return NextResponse.json(
      { error: "Pelanggan tidak ditemukan." },
      { status: 404 },
    );
  }

  const bookingCount = await prisma.booking.count({
    where: { customerId: id },
  });
  if (bookingCount > 0) {
    return NextResponse.json(
      {
        error:
          "Pelanggan ini punya riwayat booking, tidak bisa dihapus. Hapus booking-nya dulu kalau memang perlu.",
      },
      { status: 409 },
    );
  }

  await prisma.customer.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
