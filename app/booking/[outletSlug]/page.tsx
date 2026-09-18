import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
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
      services: {
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, durationMin: true, price: true },
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

        {outlet.services.length === 0 ? (
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
