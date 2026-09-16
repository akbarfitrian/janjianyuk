import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOutletSession } from "@/lib/api-session";

const transactionInclude = {
  booking: {
    select: {
      id: true,
      startTime: true,
      customer: { select: { id: true, name: true } },
      service: { select: { id: true, name: true, price: true } },
    },
  },
} as const;

// Transaction nggak punya kolom outletId langsung — scope-nya lewat relasi
// booking.outletId.
export async function GET(request: Request) {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date"); // YYYY-MM-DD, filter by createdAt

  let createdAtFilter: { gte: Date; lt: Date } | undefined;
  if (dateParam) {
    const start = new Date(`${dateParam}T00:00:00`);
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
    }
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    createdAtFilter = { gte: start, lt: end };
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      booking: { outletId: ctx.outletId },
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    },
    include: transactionInclude,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ transactions });
}

// Kasir "sederhana" — sekali submit langsung dianggap lunas (nggak ada
// alur invoice/pending payment terpisah). Cukup buat kebutuhan MVP: admin
// nyatet pembayaran yang sudah beneran diterima di kasir.
export async function POST(request: Request) {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const { bookingId, amount, method } = body as {
    bookingId?: string;
    amount?: number;
    method?: string;
  };

  if (!bookingId || amount === undefined || amount === null || !method) {
    return NextResponse.json(
      { error: "Booking, jumlah, dan metode bayar wajib diisi." },
      { status: 400 },
    );
  }
  if (amount < 0) {
    return NextResponse.json(
      { error: "Jumlah bayar tidak boleh negatif." },
      { status: 400 },
    );
  }
  if (!["cash", "qris", "transfer"].includes(method)) {
    return NextResponse.json({ error: "Metode bayar tidak valid." }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.outletId !== ctx.outletId) {
    return NextResponse.json({ error: "Booking tidak ditemukan." }, { status: 404 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      bookingId,
      amount,
      method,
      status: "paid",
      paidAt: new Date(),
    },
    include: transactionInclude,
  });

  return NextResponse.json({ transaction }, { status: 201 });
}
