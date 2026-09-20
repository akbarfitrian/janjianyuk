import { prisma } from "@/lib/prisma";

import { HoursPanel } from "./hours-panel";

export default async function BusinessHoursPage({
  params,
}: {
  params: Promise<{ outletSlug: string }>;
}) {
  const { outletSlug } = await params;

  const outlet = await prisma.outlet.findUnique({
    where: { slug: outletSlug },
    select: {
      openTime: true,
      closeTime: true,
      breakStartTime: true,
      breakEndTime: true,
    },
  });

  if (!outlet) {
    return <p className="text-sm text-ink-subtle">Outlet nggak ketemu.</p>;
  }

  return (
    <HoursPanel
      openTime={outlet.openTime}
      closeTime={outlet.closeTime}
      breakStartTime={outlet.breakStartTime}
      breakEndTime={outlet.breakEndTime}
    />
  );
}
