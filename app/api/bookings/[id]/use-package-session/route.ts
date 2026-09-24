import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireActiveOutletSession } from "@/lib/api-session";

const bookingInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  service: { select: { id: true, name: true, durationMin: true, price: true } },
  staff: { select: { id: true, name: true } },
  packageSessionUsage: {
    select: {
      id: true,
      customerPackage: {
        select: { id: true, package: { select: { name: true } } },
      },
    },
  },
} as const;

// POST: tandain booking ini "lunas" pakai satu sesi dari paket pelanggan,
// bukan bayar tunai/QRIS/transfer. Nggak bikin Transaction baru — uangnya
// udah masuk waktu paketnya dijual (lihat app/api/customer-packages), jadi
// di sini cuma nyatet PEMAKAIAN sesi + nempelin ke booking ini biar ada
// jejaknya.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id: bookingId } = await params;
  const body = await request.json();
  const { customerPackageId } = body as { customerPackageId?: string };

  if (!customerPackageId) {
    return NextResponse.json(
      { error: "Paket pelanggan wajib dipilih." },
      { status: 400 },
    );
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { packageSessionUsage: { select: { id: true } } },
  });
  if (!booking || booking.outletId !== ctx.outletId) {
    return NextResponse.json(
      { error: "Booking tidak ditemukan." },
      { status: 404 },
    );
  }
  if (booking.packageSessionUsage) {
    return NextResponse.json(
      { error: "Booking ini sudah dibayar pakai sesi paket." },
      { status: 409 },
    );
  }

  const cp = await prisma.customerPackage.findUnique({
    where: { id: customerPackageId },
    include: {
      customer: { select: { id: true, outletId: true } },
      package: {
        select: {
          name: true,
          totalSessions: true,
          items: { select: { serviceId: true } },
        },
      },
    },
  });
  if (!cp || cp.customer.outletId !== ctx.outletId) {
    return NextResponse.json(
      { error: "Paket pelanggan tidak ditemukan." },
      { status: 404 },
    );
  }
  if (cp.customer.id !== booking.customerId) {
    return NextResponse.json(
      { error: "Paket ini bukan milik pelanggan di booking ini." },
      { status: 400 },
    );
  }
  if (cp.expiresAt && cp.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Paket ini sudah kedaluwarsa." },
      { status: 400 },
    );
  }
  if (cp.usedSessions >= cp.package.totalSessions) {
    return NextResponse.json(
      { error: "Sesi paket ini sudah habis." },
      { status: 400 },
    );
  }
  const coversService = cp.package.items.some(
    (item) => item.serviceId === booking.serviceId,
  );
  if (!coversService) {
    return NextResponse.json(
      { error: "Layanan booking ini tidak termasuk dalam paket yang dipilih." },
      { status: 400 },
    );
  }

  // usedSessions < totalSessions dicek TERPISAH dari yang dibaca di atas
  // (baris cp = await prisma.customerPackage.findUnique(...)) — kalau cuma
  // itu yang dipakai buat mutusin boleh/nggaknya nge-increment, dua request
  // yang nge-pakai sesi TERAKHIR dari paket yang sama nyaris bersamaan (dua
  // booking beda, dua kasir/tab) bisa dua-duanya lolos cek pakai data basi
  // yang sama, terus dua-duanya berhasil increment — usedSessions kebablasan
  // lewat totalSessions (pelanggan dapet sesi gratis di luar yang dia
  // bayar). Sama persis kelasnya kayak race condition double-booking.
  //
  // Fix-nya: syarat "masih ada sisa" dipindah jadi bagian WHERE di
  // updateMany, bukan dibaca duluan terus ditulis belakangan — Postgres yang
  // jamin atomicitynya, bukan kode ini. count === 0 artinya kalah race
  // (sisa sesi abis duluan sama request lain) ATAU baris udah kehapus,
  // dua-duanya sama-sama harus dianggap "sesi habis", bukan sukses diam-diam.
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.customerPackage.updateMany({
      where: { id: customerPackageId, usedSessions: { lt: cp.package.totalSessions } },
      data: { usedSessions: { increment: 1 } },
    });
    if (updated.count === 0) return null;

    await tx.packageSessionUsage.create({ data: { customerPackageId, bookingId } });
    return true;
  });

  if (!result) {
    return NextResponse.json(
      { error: "Sesi paket ini baru aja habis kepakai, coba pilih paket lain." },
      { status: 409 },
    );
  }

  const updated = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: bookingInclude,
  });

  return NextResponse.json({ booking: updated });
}

// DELETE: batalin status "lunas pakai paket" di booking ini — dipakai kalau
// staff salah pilih paket. Sesi yang kepakai dikembaliin (usedSessions
// turun lagi).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id: bookingId } = await params;
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.outletId !== ctx.outletId) {
    return NextResponse.json(
      { error: "Booking tidak ditemukan." },
      { status: 404 },
    );
  }

  const usage = await prisma.packageSessionUsage.findUnique({
    where: { bookingId },
  });
  if (!usage) {
    return NextResponse.json(
      { error: "Booking ini belum dibayar pakai sesi paket." },
      { status: 404 },
    );
  }

  await prisma.$transaction([
    prisma.packageSessionUsage.delete({ where: { id: usage.id } }),
    prisma.customerPackage.update({
      where: { id: usage.customerPackageId },
      data: { usedSessions: { decrement: 1 } },
    }),
  ]);

  const updated = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: bookingInclude,
  });

  return NextResponse.json({ booking: updated });
}
