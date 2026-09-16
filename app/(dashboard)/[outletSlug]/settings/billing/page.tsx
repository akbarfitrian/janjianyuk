import { prisma } from "@/lib/prisma";
import { PLANS, getEffectiveAccess } from "@/lib/plan";

import { BillingPanel } from "./billing-panel";

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ outletSlug: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { outletSlug } = await params;
  const { status } = await searchParams;

  const outlet = await prisma.outlet.findUnique({
    where: { slug: outletSlug },
    select: {
      planName: true,
      planStatus: true,
      trialEndsAt: true,
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          planName: true,
          status: true,
          nextBillingDate: true,
          createdAt: true,
        },
      },
    },
  });

  if (!outlet) {
    return <p className="text-sm text-neutral-500">Outlet nggak ketemu.</p>;
  }

  const { access, daysLeft } = getEffectiveAccess(outlet);

  return (
    <BillingPanel
      planName={outlet.planName}
      planStatus={outlet.planStatus}
      trialEndsAt={outlet.trialEndsAt?.toISOString() ?? null}
      access={access}
      daysLeft={daysLeft}
      finishStatus={status ?? null}
      proPrice={PLANS.pro.price}
      subscriptions={outlet.subscriptions.map((s) => ({
        id: s.id,
        planName: s.planName,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        nextBillingDate: s.nextBillingDate?.toISOString() ?? null,
      }))}
    />
  );
}
