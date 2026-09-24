import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireActiveOutletSession } from "@/lib/api-session";
import { packageInclude, resolveServiceIds } from "@/lib/packages";

async function findOwnedPackage(id: string, outletId: string) {
  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg || pkg.outletId !== outletId) return null;
  return pkg;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await findOwnedPackage(id, ctx.outletId);
  if (!existing) {
    return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 404 });
  }

  const body = await request.json();
  const { name, serviceIds, totalSessions, price } = body as {
    name?: string;
    serviceIds?: string[];
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

  // serviceIds dikirim = ganti seluruh isi paket dengan daftar baru itu.
  // Nggak dikirim = layanan di paket dibiarin apa adanya.
  let newServiceIds: string[] | undefined;
  if (serviceIds !== undefined) {
    const services = await resolveServiceIds(serviceIds, ctx.outletId);
    if (!services.ok) {
      return NextResponse.json({ error: services.error }, { status: services.status });
    }
    newServiceIds = services.serviceIds;
  }

  // Satu transaksi: kalau ada yang gagal di tengah, paket nggak boleh
  // kejebak tanpa layanan sama sekali.
  const pkg = await prisma.$transaction(async (tx) => {
    if (newServiceIds) {
      await tx.packageItem.deleteMany({ where: { packageId: id } });
      await tx.packageItem.createMany({
        data: newServiceIds.map((serviceId) => ({ packageId: id, serviceId })),
      });
    }

    return tx.package.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(totalSessions !== undefined ? { totalSessions } : {}),
        ...(price !== undefined ? { price } : {}),
      },
      include: packageInclude,
    });
  });

  return NextResponse.json({ package: pkg });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireActiveOutletSession();
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
