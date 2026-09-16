// Definisi paket berbayar + helper status akses buat lapisan billing SaaS
// (Fase 4). Trial nggak di-expire lewat cron — statusnya dihitung on-the-fly
// dari `trialEndsAt` tiap kali outlet diakses, jadi nggak ada cron terpisah
// yang bisa telat/gagal jalan dan bikin trial "nyangkut" aktif.

export const PLANS = {
  pro: {
    name: "pro",
    label: "Pro",
    price: 149_000, // Rp/bulan
  },
} as const;

export type PlanName = keyof typeof PLANS;

export function isPlanName(value: string): value is PlanName {
  return value in PLANS;
}

export interface OutletPlanInfo {
  planStatus: string; // trial, active, past_due, cancelled
  trialEndsAt: Date | null;
}

export type EffectiveAccess = "ok" | "trial_expiring" | "locked";

const TRIAL_WARNING_DAYS = 3;

/**
 * `active`         -> akses penuh, nggak ada peringatan.
 * `past_due`       -> gagal perpanjang, langsung dikunci (nggak ada masa
 *                      tenggang tambahan; owner tetap bisa buka Billing).
 * `cancelled`      -> dikunci.
 * `trial` + masih  -> akses penuh, dengan peringatan kalau sisa <= 3 hari.
 *   ada sisa hari
 * `trial` + habis  -> dikunci.
 */
export function getEffectiveAccess(outlet: OutletPlanInfo): {
  access: EffectiveAccess;
  daysLeft: number | null;
} {
  if (outlet.planStatus === "active") {
    return { access: "ok", daysLeft: null };
  }

  if (outlet.planStatus === "past_due" || outlet.planStatus === "cancelled") {
    return { access: "locked", daysLeft: null };
  }

  // planStatus === "trial" (atau nilai nggak dikenal lain — default aman:
  // anggap perlu trialEndsAt buat tetap dapat akses).
  if (!outlet.trialEndsAt) {
    return { access: "locked", daysLeft: null };
  }

  const msLeft = outlet.trialEndsAt.getTime() - Date.now();
  const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));

  if (msLeft <= 0) {
    return { access: "locked", daysLeft: 0 };
  }

  if (daysLeft <= TRIAL_WARNING_DAYS) {
    return { access: "trial_expiring", daysLeft };
  }

  return { access: "ok", daysLeft };
}
