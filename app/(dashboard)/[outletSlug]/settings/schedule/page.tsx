import { prisma } from "@/lib/prisma";
import { jakartaDateStringNow } from "@/lib/tz";

import { SchedulePanel } from "./schedule-panel";

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ outletSlug: string }>;
}) {
  const { outletSlug } = await params;

  const outlet = await prisma.outlet.findUnique({
    where: { slug: outletSlug },
    select: {
      id: true,
      closedWeekdays: true,
      staff: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true },
      },
    },
  });

  if (!outlet) {
    return <p className="text-sm text-ink-subtle">Outlet nggak ketemu.</p>;
  }

  // Yang sudah lewat nggak perlu ditampilkan — panel ini soal jadwal ke depan.
  const today = jakartaDateStringNow();

  const [closures, timeOffs] = await Promise.all([
    prisma.outletClosure.findMany({
      where: { outletId: outlet.id, date: { gte: today } },
      orderBy: { date: "asc" },
      select: { id: true, date: true, reason: true },
    }),
    prisma.staffTimeOff.findMany({
      where: { staff: { outletId: outlet.id }, date: { gte: today } },
      orderBy: { date: "asc" },
      select: { id: true, staffId: true, date: true, reason: true },
    }),
  ]);

  return (
    <SchedulePanel
      initialClosedWeekdays={outlet.closedWeekdays}
      initialClosures={closures}
      staff={outlet.staff}
      initialTimeOffs={timeOffs}
    />
  );
}
