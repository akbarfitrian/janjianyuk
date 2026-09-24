import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { formatHoursLabel } from "@/lib/business-hours";
import { getEffectiveAccess } from "@/lib/plan";
import { formatClosedDaysLabel } from "@/lib/schedule";
import { PublicBookingForm } from "./booking-form";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ outletSlug: string }>;
}) {
  const { outletSlug } = await params;

  const outlet = await prisma.outlet.findUnique({
    where: { slug: outletSlug },
    select: {
      name: true,
      openTime: true,
      closeTime: true,
      breakStartTime: true,
      breakEndTime: true,
      closedWeekdays: true,
      planStatus: true,
      trialEndsAt: true,
      services: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          category: true,
          description: true,
          durationMin: true,
          price: true,
          priceFrom: true,
        },
      },
      staff: {
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true },
      },
    },
  });

  if (!outlet) {
    notFound();
  }

  const closedDays = formatClosedDaysLabel(outlet.closedWeekdays);
  // Sama kayak gate di dashboard (lib/plan.ts) — outlet yang trial-nya
  // habis/nunggak/dibatalin nggak boleh tetap nerima booking baru dari
  // publik. Dicek di sini juga (bukan cuma di POST /api/public/.../bookings)
  // biar pelanggan nggak isi form dulu baru ditolak pas submit.
  const locked = getEffectiveAccess(outlet).access === "locked";

  return (
    <main className="flex-1 px-6 py-12">
      <div className="mx-auto max-w-lg">
        <h1 className="text-xl font-semibold text-ink">
          {outlet.name}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Pilih layanan dan jam kosong, isi data kamu, langsung dapat
          konfirmasi lewat WhatsApp.
        </p>
        <p className="mt-1 text-sm text-ink-subtle">
          Jam operasional: {formatHoursLabel(outlet)}
          {closedDays && <> · Tutup setiap {closedDays}</>}
        </p>

        {locked ? (
          <p className="mt-8 rounded-lg border border-dashed border-line-strong p-6 text-center text-sm text-ink-subtle">
            {outlet.name} lagi nggak bisa nerima booking online. Coba hubungi
            outlet langsung ya.
          </p>
        ) : outlet.services.length === 0 ? (
          <p className="mt-8 rounded-lg border border-dashed border-line-strong p-6 text-center text-sm text-ink-subtle">
            {outlet.name} belum punya layanan yang bisa dibooking online.
          </p>
        ) : (
          <PublicBookingForm
            outletSlug={outletSlug}
            services={outlet.services}
            staffList={outlet.staff}
          />
        )}
      </div>
    </main>
  );
}
