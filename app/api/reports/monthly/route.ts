import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireActiveOutletSession } from "@/lib/api-session";
import {
  endOfJakartaMonth,
  jakartaYearMonthNow,
  startOfJakartaMonth,
  toJakartaDateString,
} from "@/lib/tz";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Laporan ini ngitung semua Transaction yang statusnya "paid", baik yang
// nempel ke booking (bayar per kunjungan di Kasir) maupun yang nempel ke
// CustomerPackage (bayar paket di muka waktu dijual di menu Paket).
// monthTotal = gabungan keduanya; bookingTotal/packageTotal dipecah biar
// owner bisa lihat kontribusi masing-masing.
export async function GET(request: Request) {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month"); // format YYYY-MM

  const [year, month] = monthParam
    ? monthParam.split("-").map(Number)
    : (() => {
        const { year: y, month: m } = jakartaYearMonthNow();
        return [y, m];
      })();

  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "Bulan tidak valid." }, { status: 400 });
  }

  const monthStart = startOfJakartaMonth(year, month);
  const monthEnd = endOfJakartaMonth(year, month);

  const transactions = await prisma.transaction.findMany({
    where: {
      status: "paid",
      paidAt: { gte: monthStart, lt: monthEnd },
      OR: [
        { booking: { outletId: ctx.outletId } },
        { customerPackage: { customer: { outletId: ctx.outletId } } },
      ],
    },
    select: { amount: true, paidAt: true, customerPackageId: true },
  });

  const dayTotals = new Map<string, { total: number; count: number }>();
  let bookingTotal = 0;
  let packageTotal = 0;
  for (const tx of transactions) {
    if (!tx.paidAt) continue;
    const key = toJakartaDateString(tx.paidAt);
    const current = dayTotals.get(key) ?? { total: 0, count: 0 };
    current.total += tx.amount;
    current.count += 1;
    dayTotals.set(key, current);
    if (tx.customerPackageId) {
      packageTotal += tx.amount;
    } else {
      bookingTotal += tx.amount;
    }
  }

  const days = Array.from(dayTotals.entries())
    .map(([date, v]) => ({ date, total: v.total, count: v.count }))
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // terbaru dulu

  const monthTotal = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  return NextResponse.json({
    month: `${year}-${pad(month)}`,
    monthTotal,
    monthCount: transactions.length,
    bookingTotal,
    packageTotal,
    days,
  });
}
