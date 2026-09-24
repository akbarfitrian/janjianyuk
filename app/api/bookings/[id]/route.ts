import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireActiveOutletSession } from "@/lib/api-session";
import { isForeignKeyViolation } from "@/lib/db-errors";

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
  const ctx = await requireActiveOutletSession();
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
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing || existing.outletId !== ctx.outletId) {
    return NextResponse.json(
      { error: "Booking tidak ditemukan." },
      { status: 404 },
    );
  }

  // Booking yang sudah punya catatan uang masuk (bayar tunai/QRIS/transfer di
  // Kasir, atau bayar pakai sesi paket) sengaja DIBLOK, bukan ikut kehapus —
  // beda dari NotificationLog di bawah yang cuma log kirim WA, nggak
  // menyangkut uang sama sekali.
  const [paidTransaction, packageUsage] = await Promise.all([
    prisma.transaction.findFirst({ where: { bookingId: id, status: "paid" } }),
    prisma.packageSessionUsage.findUnique({ where: { bookingId: id } }),
  ]);
  if (paidTransaction || packageUsage) {
    return NextResponse.json(
      {
        error:
          "Booking ini sudah ada catatan pembayaran, tidak bisa dihapus. Batalkan pembayarannya dulu di menu Kasir kalau memang perlu.",
      },
      { status: 409 },
    );
  }

  // NotificationLog nunjuk wajib ke Booking (FK RESTRICT) — hampir semua
  // booking punya baris ini (konfirmasi WA pas dibuat, atau reminder H-1 dari
  // cron), jadi harus dibersihin dulu di transaction yang sama, bukan
  // dibiarin bikin delete di bawah gagal mentah-mentah.
  try {
    await prisma.$transaction([
      prisma.notificationLog.deleteMany({ where: { bookingId: id } }),
      prisma.booking.delete({ where: { id } }),
    ]);
  } catch (err) {
    // Jaring pengaman kalau ada relasi baru ke Booking yang belum dicek di
    // atas, atau ada transaksi/pemakaian sesi baru nyelip di antara
    // pengecekan dan hapus.
    if (isForeignKeyViolation(err)) {
      return NextResponse.json(
        { error: "Booking ini masih dipakai data lain, tidak bisa dihapus." },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}