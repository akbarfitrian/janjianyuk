import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOutletSession } from "@/lib/api-session";
import { createSubscriptionCharge } from "@/lib/payment";
import { isPlanName, type PlanName } from "@/lib/plan";

export async function POST(request: Request) {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const body = await request.json().catch(() => ({}));
  const requestedPlan = (body?.planName as string) ?? "pro";

  if (!isPlanName(requestedPlan)) {
    return NextResponse.json({ error: "Paket nggak valid." }, { status: 400 });
  }
  const planName: PlanName = requestedPlan;

  const outlet = await prisma.outlet.findUnique({
    where: { id: ctx.outletId },
  });
  if (!outlet) {
    return NextResponse.json({ error: "Outlet nggak ketemu." }, { status: 404 });
  }

  // Setiap klik "Upgrade" bikin Subscription baru berstatus "pending" —
  // riwayatnya kepakai buat log percobaan bayar (termasuk yang gagal), dan
  // gatewayRef-nya jadi kunci buat nyocokin webhook balik ke record ini.
  const subscription = await prisma.subscription.create({
    data: { outletId: outlet.id, planName, status: "pending" },
  });

  const orderRef = `janjianyuk-${subscription.id}`;
  const origin =
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const charge = await createSubscriptionCharge({
    outletName: outlet.name,
    ownerEmail: outlet.ownerEmail,
    planName,
    orderRef,
    redirectBaseUrl: `${origin}/${outlet.slug}`,
  });

  if (!charge.success || !charge.redirectUrl) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "cancelled" },
    });

    return NextResponse.json(
      { error: charge.error ?? "Gagal membuat tagihan pembayaran." },
      { status: 502 },
    );
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { gatewayRef: charge.gatewayRef },
  });

  return NextResponse.json({ redirectUrl: charge.redirectUrl });
}
