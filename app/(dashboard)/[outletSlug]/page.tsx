import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";
import {
  PLANS,
  PLAN_STATUS_LABEL,
  getEffectiveAccess,
  isPlanName,
} from "@/lib/plan";
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

function formatTanggalPendek(date: Date) {
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  });
}

// Kartu keempat ngikutin status paket: trial nampilin sisa hari, paket aktif
// nampilin tanggal perpanjangan. Sebelumnya selalu "Trial berakhir", padahal
// outlet yang udah Pro masih nyimpen trialEndsAt lama di database.
function getPlanCard(
  outlet: { planName: string; planStatus: string; trialEndsAt: Date | null },
  nextBillingDate: Date | null,
) {
  if (outlet.planStatus === "trial") {
    const { daysLeft } = getEffectiveAccess(outlet);
    return {
      label: "Sisa trial",
      value: daysLeft === null ? "—" : `${daysLeft} hari`,
      hint: outlet.trialEndsAt
        ? `Berakhir ${formatTanggalPendek(outlet.trialEndsAt)}`
        : "Upgrade lewat menu Tagihan",
    };
  }

  if (outlet.planStatus === "active") {
    const planLabel = isPlanName(outlet.planName)
      ? PLANS[outlet.planName].label
      : outlet.planName;
    return {
      label: "Perpanjangan",
      value: nextBillingDate ? formatTanggalPendek(nextBillingDate) : "—",
      hint: `Paket ${planLabel}`,
    };
  }

  return {
    label: "Paket",
    value: PLAN_STATUS_LABEL[outlet.planStatus] ?? "—",
    hint: "Cek di menu Tagihan",
  };
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-line p-5">
      <p className="text-sm text-ink-subtle">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-subtle">{hint}</p>
    </div>
  );
}

export default async function DashboardOverviewPage({
  params,
}: {
  params: Promise<{ outletSlug: string }>;
}) {
  const { outletSlug } = await params;

  const outlet = await prisma.outlet.findUnique({
    where: { slug: outletSlug },
    select: {
      id: true,
      planName: true,
      planStatus: true,
      trialEndsAt: true,
      subscriptions: {
        where: { status: "active" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { nextBillingDate: true },
      },
    },
  });

  // Layout dashboard udah mastiin outlet-nya ada; ini cuma buat ngeyakinin
  // TypeScript.
  if (!outlet) notFound();

  const { year, month } = jakartaYearMonthNow();
  const startOfToday = startOfJakartaDay(jakartaDateStringNow());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  const startOfMonth = startOfJakartaMonth(year, month);
  const startOfNextMonth = endOfJakartaMonth(year, month);

  const [
    bookingsToday,
    bookingsThisMonth,
    paidThisMonth,
    serviceCount,
    staffCount,
  ] = await Promise.all([
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
    prisma.service.count({ where: { outletId: outlet.id, isActive: true } }),
    prisma.staff.count({ where: { outletId: outlet.id } }),
  ]);

  const revenueThisMonth = paidThisMonth.reduce(
    (sum, tx) => sum + tx.amount,
    0,
  );

  const now = new Date();
  const todayLabel = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  });
  const monthLabel = now.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

  const planCard = getPlanCard(
    outlet,
    outlet.subscriptions[0]?.nextBillingDate ?? null,
  );

  // Langkah awal yang belum beres. Cuma nongol kalau masih ada yang kurang,
  // dan hilang sendiri begitu layanan & staff pertama ditambahin. Staff
  // sifatnya opsional buat booking online (tanpa staff, jam kosong dihitung
  // per outlet), jadi teksnya nggak maksa.
  const nextSteps: { title: string; desc: string; href: string }[] = [];
  if (serviceCount === 0) {
    nextSteps.push({
      title: "Tambah layanan pertama",
      desc: "Tanpa layanan, pelanggan belum bisa booking lewat link di bawah.",
      href: `/${outletSlug}/services`,
    });
  }
  if (staffCount === 0) {
    nextSteps.push({
      title: "Tambah staff",
      desc: "Biar kalender dan jam kosong bisa dibagi per orang.",
      href: `/${outletSlug}/staff`,
    });
  }

  const siteUrl = await getSiteUrl();
  const bookingUrl = `${siteUrl}/booking/${outletSlug}`;

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Ringkasan</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Booking hari ini"
          value={bookingsToday}
          hint={todayLabel}
        />
        <StatCard
          label="Booking bulan ini"
          value={bookingsThisMonth}
          hint={monthLabel}
        />
        <StatCard
          label="Pendapatan bulan ini"
          value={formatRupiah(revenueThisMonth)}
          hint="Pembayaran tercatat di Kasir"
        />
        <StatCard
          label={planCard.label}
          value={planCard.value}
          hint={planCard.hint}
        />
      </div>

      {nextSteps.length > 0 && (
        <div className="mt-4 rounded-lg border border-line p-5">
          <p className="text-sm font-medium text-ink">Langkah awal</p>
          <ul className="mt-3 divide-y divide-line">
            {nextSteps.map((step) => (
              <li
                key={step.href}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink">{step.title}</p>
                  <p className="mt-0.5 text-xs text-ink-subtle">{step.desc}</p>
                </div>
                <Link
                  href={step.href}
                  className="shrink-0 text-sm font-medium text-azure transition-colors hover:text-azure-hover"
                >
                  Buka →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <BookingLinkCard bookingUrl={bookingUrl} />
    </div>
  );
}
