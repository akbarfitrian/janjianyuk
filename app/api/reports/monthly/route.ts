import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOutletSession } from "@/lib/api-session";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Laporan ini cuma ngitung pendapatan dari Transaction yang statusnya
// "paid" — jadi belum termasuk penjualan paket (CustomerPackage), karena
// Transaction.bookingId wajib diisi di schema dan pembelian paket nggak
// selalu nempel ke satu booking tertentu. Kalau nanti mau paket ikut
// kehitung, perlu ubah skema Transaction dulu (bookingId jadi opsional atau
// tambah relasi ke CustomerPackage).
export async function GET(request: Request) {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month"); // format YYYY-MM

  const now = new Date();
  const [year, month] = monthParam
    ? monthParam.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];

  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "Bulan tidak valid." }, { status: 400 });
  }

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const transactions = await prisma.transaction.findMany({
    where: {
      status: "paid",
      paidAt: { gte: monthStart, lt: monthEnd },
      booking: { outletId: ctx.outletId },
    },
    select: { amount: true, paidAt: true },
  });

  const dayTotals = new Map<string, { total: number; count: number }>();
  for (const tx of transactions) {
    if (!tx.paidAt) continue;
    const key = `${tx.paidAt.getFullYear()}-${pad(tx.paidAt.getMonth() + 1)}-${pad(tx.paidAt.getDate())}`;
    const current = dayTotals.get(key) ?? { total: 0, count: 0 };
    current.total += tx.amount;
    current.count += 1;
    dayTotals.set(key, current);
  }

  const days = Array.from(dayTotals.entries())
    .map(([date, v]) => ({ date, total: v.total, count: v.count }))
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // terbaru dulu

  const monthTotal = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  return NextResponse.json({
    month: `${year}-${pad(month)}`,
    monthTotal,
    monthCount: transactions.length,
    days,
  });
}
