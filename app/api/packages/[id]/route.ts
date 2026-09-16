import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOutletSession } from "@/lib/api-session";

async function findOwnedPackage(id: string, outletId: string) {
  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg || pkg.outletId !== outletId) return null;
  return pkg;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await findOwnedPackage(id, ctx.outletId);
  if (!existing) {
    return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 404 });
  }

  const body = await request.json();
  const { name, serviceId, totalSessions, price } = body as {
    name?: string;
    serviceId?: string;
    totalSessions?: number;
    price?: number;
  };

  if (totalSessions !== undefined && totalSessions <= 0) {
    return NextResponse.json(
      { error: "Jumlah sesi harus lebih dari 0." },
      { status: 400 },
    );
  }
  if (price !== undefined && price < 0) {
    return NextResponse.json({ error: "Harga tidak boleh negatif." }, { status: 400 });
  }
  if (serviceId !== undefined) {
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || service.outletId !== ctx.outletId) {
      return NextResponse.json({ error: "Layanan tidak ditemukan." }, { status: 404 });
    }
  }

  const pkg = await prisma.package.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(serviceId !== undefined ? { serviceId } : {}),
      ...(totalSessions !== undefined ? { totalSessions } : {}),
      ...(price !== undefined ? { price } : {}),
    },
    include: { service: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ package: pkg });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await findOwnedPackage(id, ctx.outletId);
  if (!existing) {
    return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 404 });
  }

  const purchaseCount = await prisma.customerPackage.count({
    where: { packageId: id },
  });
  if (purchaseCount > 0) {
    return NextResponse.json(
      {
        error:
          "Paket ini udah pernah dibeli pelanggan, nggak bisa dihapus. Edit aja kalau mau ubah.",
      },
      { status: 409 },
    );
  }

  await prisma.package.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
