"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Dipasang di dashboard layout, ngebungkus semua {children}. Kalau outlet
 * "locked" (trial habis / past_due / cancelled), semua halaman dashboard
 * diganti tampilan terkunci KECUALI halaman Billing sendiri — owner tetap
 * harus bisa buka Billing buat bayar/upgrade.
 *
 * Pengecekan pathname dilakukan di client (bukan lewat middleware) supaya
 * nggak nambah query Prisma di tiap request lewat Edge middleware — outlet
 * udah sekali di-query di layout.tsx (Node runtime), hasilnya cuma dioper
 * ke sini buat nentuin halaman mana yang boleh tembus.
 */
export function AccessGate({
  outletSlug,
  locked,
  reason,
  children,
}: {
  outletSlug: string;
  locked: boolean;
  reason: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isBillingPage = pathname === `/${outletSlug}/settings/billing`;

  if (locked && !isBillingPage) {
    return (
      <div className="rounded-lg border border-danger-line bg-danger-soft p-8 text-center">
        <p className="text-sm font-medium text-danger-strong">Akses dikunci</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-danger">{reason}</p>
        <Link
          href={`/${outletSlug}/settings/billing`}
          className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover"
        >
          Buka halaman Billing
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
