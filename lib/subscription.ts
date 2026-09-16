import { prisma } from "@/lib/prisma";
import type { PaymentOutcome } from "@/lib/payment";

const SUBSCRIPTION_PERIOD_DAYS = 30;

/**
 * Dipanggil dari kedua webhook (Midtrans & Xendit) setelah signature/token
 * diverifikasi. `gatewayRef` = order_id (Midtrans) / external_id (Xendit)
 * yang dibikin pas Subscription dibuat di app/api/billing/upgrade.
 */
export async function applySubscriptionOutcome(
  gatewayRef: string,
  outcome: PaymentOutcome,
) {
  const subscription = await prisma.subscription.findFirst({
    where: { gatewayRef },
  });

  if (!subscription) {
    console.warn(
      `[subscription] gatewayRef "${gatewayRef}" nggak ketemu di tabel Subscription — webhook diabaikan`,
    );
    return null;
  }

  if (outcome === "pending") {
    // Belum ada perubahan status — nunggu notifikasi final (paid/failed)
    // dari gateway. Subscription tetap "pending".
    return subscription;
  }

  if (outcome === "paid") {
    const nextBillingDate = new Date(
      Date.now() + SUBSCRIPTION_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    );

    const [updated] = await prisma.$transaction([
      prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "active", nextBillingDate },
      }),
      prisma.outlet.update({
        where: { id: subscription.outletId },
        data: { planStatus: "active", planName: subscription.planName },
      }),
    ]);

    return updated;
  }

  // outcome === "failed"
  const outlet = await prisma.outlet.findUnique({
    where: { id: subscription.outletId },
    select: { planStatus: true },
  });

  const [updated] = await prisma.$transaction([
    prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "cancelled" },
    }),
    // Kalau outlet ini sebelumnya udah "active" (berarti ini percobaan
    // PERPANJANGAN yang gagal), turunin ke "past_due" biar dikunci sampai
    // dibayar ulang. Kalau belum pernah aktif (upgrade pertama gagal),
    // biarin planStatus apa adanya (trial dst) — owner masih bisa coba
    // upgrade lagi kapan aja lewat halaman Billing.
    ...(outlet?.planStatus === "active"
      ? [
          prisma.outlet.update({
            where: { id: subscription.outletId },
            data: { planStatus: "past_due" },
          }),
        ]
      : []),
  ]);

  return updated;
}
