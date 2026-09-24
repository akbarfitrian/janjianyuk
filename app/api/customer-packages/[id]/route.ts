import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireActiveOutletSession } from "@/lib/api-session";
import { customerPackageInclude } from "@/lib/packages";

async function findOwnedCustomerPackage(id: string, outletId: string) {
  const cp = await prisma.customerPackage.findUnique({
    where: { id },
    include: {
      customer: { select: { outletId: true } },
      package: { select: { totalSessions: true } },
    },
  });
  if (!cp || cp.customer.outletId !== outletId) return null;
  return cp;
}

// Pakai (+1 sesi) atau batalin pemakaian (-1 sesi, buat koreksi salah klik).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await findOwnedCustomerPackage(id, ctx.outletId);
  if (!existing) {
    return NextResponse.json(
      { error: "Paket pelanggan tidak ditemukan." },
      { status: 404 },
    );
  }

  const body = await request.json();
  const { action } = body as { action?: "use" | "undo" };

  if (action === "use") {
    if (existing.expiresAt && existing.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Paket ini udah kedaluwarsa." },
        { status: 400 },
      );
    }
    if (existing.usedSessions >= existing.package.totalSessions) {
      return NextResponse.json(
        { error: "Sesi paket ini udah habis." },
        { status: 400 },
      );
    }

    // bookingId null = dipakai manual dari sini (kunjungan yang nggak
    // dicatat sebagai Booking formal), beda dari "Bayar pakai sesi paket"
    // di Kasir yang nempelin ke booking tertentu.
    const [customerPackage] = await prisma.$transaction([
      prisma.customerPackage.update({
        where: { id },
        data: { usedSessions: { increment: 1 } },
        include: customerPackageInclude,
      }),
      prisma.packageSessionUsage.create({
        data: { customerPackageId: id, bookingId: null },
      }),
    ]);
    return NextResponse.json({ customerPackage });
  }

  if (action === "undo") {
    if (existing.usedSessions <= 0) {
      return NextResponse.json(
        { error: "Belum ada sesi yang dipakai." },
        { status: 400 },
      );
    }

    // Batalin pemakaian TERAKHIR (LIFO). Kalau pemakaian terakhir itu
    // ternyata nempel ke booking tertentu (dipakai lewat Kasir), jangan
    // dibatalin dari sini — arahin ke Kasir biar status booking-nya ikut
    // kebenerin juga, bukan cuma angka sisa sesinya doang.
    const lastUsage = await prisma.packageSessionUsage.findFirst({
      where: { customerPackageId: id },
      orderBy: { usedAt: "desc" },
    });
    if (lastUsage?.bookingId) {
      return NextResponse.json(
        {
          error:
            "Pemakaian sesi terakhir itu buat sebuah booking — batalin dari menu Kasir, bukan dari sini.",
        },
        { status: 409 },
      );
    }

    // Kalau lastUsage null, berarti sisa sesi ini dari data lama sebelum
    // jejak pemakaian ini ada — turunin angkanya aja, nggak ada baris buat
    // dihapus.
    const [customerPackage] = await prisma.$transaction([
      prisma.customerPackage.update({
        where: { id },
        data: { usedSessions: { decrement: 1 } },
        include: customerPackageInclude,
      }),
      ...(lastUsage
        ? [prisma.packageSessionUsage.delete({ where: { id: lastUsage.id } })]
        : []),
    ]);
    return NextResponse.json({ customerPackage });
  }

  return NextResponse.json({ error: "Aksi tidak valid." }, { status: 400 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await findOwnedCustomerPackage(id, ctx.outletId);
  if (!existing) {
    return NextResponse.json(
      { error: "Paket pelanggan tidak ditemukan." },
      { status: 404 },
    );
  }

  await prisma.customerPackage.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
