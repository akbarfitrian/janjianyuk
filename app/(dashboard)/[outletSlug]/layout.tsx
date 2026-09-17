import { redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveAccess } from "@/lib/plan";
import { AccessGate } from "@/components/access-gate";
import { DashboardNav } from "@/components/dashboard-nav";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ outletSlug: string }>;
}) {
  const { outletSlug } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.outletSlug !== outletSlug) {
    // Login tapi bukan pemilik outlet ini — jangan biarkan intip dashboard
    // outlet lain lewat ganti URL.
    redirect(`/${session.user.outletSlug ?? ""}`);
  }

  const outlet = await prisma.outlet.findUnique({
    where: { slug: outletSlug },
    select: { name: true, planName: true, planStatus: true, trialEndsAt: true },
  });

  if (!outlet) {
    redirect("/login");
  }

  const { access, daysLeft } = getEffectiveAccess(outlet);
  const lockReason =
    outlet.planStatus === "past_due"
      ? "Pembayaran perpanjangan gagal. Upgrade lagi lewat Billing buat lanjut pakai fitur ini."
      : "Trial kamu udah habis. Upgrade ke Pro lewat Billing buat lanjut pakai fitur ini.";

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <DashboardNav
        outletSlug={outletSlug}
        outletName={outlet.name}
        planName={outlet.planName}
        planStatus={outlet.planStatus}
        userName={session.user.name}
        userEmail={session.user.email}
      />

      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        {access === "trial_expiring" && (
          <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Trial berakhir {daysLeft === 0 ? "hari ini" : `${daysLeft} hari lagi`}.{" "}
            <Link
              href={`/${outletSlug}/settings/billing`}
              className="underline underline-offset-4"
            >
              Upgrade ke Pro
            </Link>{" "}
            biar nggak keputus.
          </p>
        )}
        <AccessGate outletSlug={outletSlug} locked={access === "locked"} reason={lockReason}>
          {children}
        </AccessGate>
      </main>
    </div>
  );
}
