import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";
import { BookingLinkCard } from "@/components/booking-link-card";
import {
  endOfJakartaMonth,
  jakartaDateStringNow,
  jakartaYearMonthNow,
  startOfJakartaDay,
  startOfJakartaMonth,
} from "@/lib/tz";

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

export default async function DashboardOverviewPage({
  params,
}: {
  params: Promise<{ outletSlug: string }>;
}) {
  const { outletSlug } = await params;

  const outlet = await prisma.outlet.findUnique({
    where: { slug: outletSlug },
    select: { id: true, trialEndsAt: true },
  });

  const { year, month } = jakartaYearMonthNow();
  const startOfToday = startOfJakartaDay(jakartaDateStringNow());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  const startOfMonth = startOfJakartaMonth(year, month);
  const startOfNextMonth = endOfJakartaMonth(year, month);

  let bookingsToday = 0;
  let bookingsThisMonth = 0;
  let revenueThisMonth = 0;

  if (outlet) {
    const [todayCount, monthCount, paidThisMonth] = await Promise.all([
      prisma.booking.count({
        where: {
          outletId: outlet.id,
          startTime: { gte: startOfToday, lt: endOfToday },
        },
      }),
      prisma.booking.count({
        where: {
          outletId: outlet.id,
          startTime: { gte: startOfMonth, lt: startOfNextMonth },
        },
      }),
      // Mulai Fase 3, "pendapatan" dihitung dari Transaction yang beneran
      // dicatat lewat menu Kasir (status "paid"), bukan lagi estimasi dari
      // harga layanan booking "completed". Belum termasuk penjualan paket
      // (lihat catatan di app/api/reports/monthly).
      prisma.transaction.findMany({
        where: {
          status: "paid",
          paidAt: { gte: startOfMonth, lt: startOfNextMonth },
          booking: { outletId: outlet.id },
        },
        select: { amount: true },
      }),
    ]);

    bookingsToday = todayCount;
    bookingsThisMonth = monthCount;
    revenueThisMonth = paidThisMonth.reduce((sum, tx) => sum + tx.amount, 0);
  }

  const siteUrl = await getSiteUrl();
  const bookingUrl = `${siteUrl}/booking/${outletSlug}`;

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Overview</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-line p-5">
          <p className="text-sm text-ink-subtle">Booking hari ini</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {bookingsToday}
          </p>
        </div>
        <div className="rounded-lg border border-line p-5">
          <p className="text-sm text-ink-subtle">Booking bulan ini</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {bookingsThisMonth}
          </p>
        </div>
        <div className="rounded-lg border border-line p-5">
          <p className="text-sm text-ink-subtle">Pendapatan bulan ini</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {formatRupiah(revenueThisMonth)}
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            Dari pembayaran yang dicatat di menu Kasir
          </p>
        </div>
        <div className="rounded-lg border border-line p-5">
          <p className="text-sm text-ink-subtle">Trial berakhir</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {outlet?.trialEndsAt
              ? new Date(outlet.trialEndsAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  timeZone: "Asia/Jakarta",
                })
              : "—"}
          </p>
        </div>
      </div>

      <BookingLinkCard bookingUrl={bookingUrl} />

      <p className="mt-8 text-sm text-ink-subtle">
        Atur layanan, staff, dan pelanggan lewat menu di kiri, bikin booking
        manual dari menu Booking, jual paket lewat menu Paket, dan catat
        pembayaran lewat menu Kasir.
      </p>
    </div>
  );
}
