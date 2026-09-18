"use client";

import { useState } from "react";

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const PLAN_STATUS_LABEL: Record<string, string> = {
  trial: "Trial",
  active: "Aktif",
  past_due: "Nunggak",
  cancelled: "Dibatalkan",
};

const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu pembayaran",
  active: "Berhasil",
  cancelled: "Gagal / dibatalkan",
};

interface SubscriptionRow {
  id: string;
  planName: string;
  status: string;
  createdAt: string;
  nextBillingDate: string | null;
}

export function BillingPanel({
  planName,
  planStatus,
  trialEndsAt,
  access,
  daysLeft,
  finishStatus,
  proPrice,
  subscriptions,
}: {
  planName: string;
  planStatus: string;
  trialEndsAt: string | null;
  access: "ok" | "trial_expiring" | "locked";
  daysLeft: number | null;
  finishStatus: string | null;
  proPrice: number;
  subscriptions: SubscriptionRow[];
}) {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPro = planStatus === "active";

  async function handleUpgrade() {
    setError(null);
    setIsUpgrading(true);

    try {
      const res = await fetch("/api/billing/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planName: "pro" }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.redirectUrl) {
        setError(data.error ?? "Gagal membuat tagihan. Coba lagi.");
        setIsUpgrading(false);
        return;
      }

      window.location.href = data.redirectUrl;
    } catch {
      setError("Gagal konek ke server. Coba lagi.");
      setIsUpgrading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Billing</h1>

      {finishStatus === "finish" && (
        <p className="mt-4 rounded-md border border-info-line bg-info-soft px-4 py-3 text-sm text-info">
          Pembayaran sedang diproses. Status di bawah otomatis keupdate begitu
          gateway ngirim konfirmasi (biasanya beberapa detik sampai menit —
          refresh halaman ini kalau belum berubah).
        </p>
      )}
      {finishStatus === "failed" && (
        <p className="mt-4 rounded-md border border-danger-line bg-danger-soft px-4 py-3 text-sm text-danger">
          Pembayaran nggak berhasil. Coba lagi kapan aja lewat tombol di bawah.
        </p>
      )}

      {access === "locked" && (
        <p className="mt-4 rounded-md border border-danger-line bg-danger-soft px-4 py-3 text-sm text-danger">
          {planStatus === "past_due"
            ? "Pembayaran perpanjangan gagal. Menu lain di dashboard dikunci sampai upgrade berhasil."
            : "Trial kamu udah habis. Menu lain di dashboard dikunci sampai upgrade ke Pro."}
        </p>
      )}
      {access === "trial_expiring" && (
        <p className="mt-4 rounded-md border border-warn-line bg-warn-soft px-4 py-3 text-sm text-warn">
          Trial kamu berakhir {daysLeft === 0 ? "hari ini" : `${daysLeft} hari lagi`}.
          Upgrade sekarang biar nggak keputus.
        </p>
      )}

      <div className="mt-6 rounded-lg border border-line p-5">
        <p className="text-sm text-ink-subtle">Paket saat ini</p>
        <p className="mt-1 text-2xl font-semibold capitalize text-ink">
          {planName} · {PLAN_STATUS_LABEL[planStatus] ?? planStatus}
        </p>
        {planStatus === "trial" && trialEndsAt && (
          <p className="mt-1 text-sm text-ink-subtle">
            Trial berakhir {formatTanggal(trialEndsAt)}
          </p>
        )}

        {!isPro && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-sm text-ink-muted">
              Upgrade ke <strong>Pro</strong> — {formatRupiah(proPrice)}/bulan
            </p>
            <button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="mt-3 rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
            >
              {isUpgrading ? "Memproses..." : "Upgrade ke Pro"}
            </button>
            {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          </div>
        )}
        {isPro && (
          <p className="mt-2 text-sm text-ink-subtle">
            Paket Pro aktif. Perpanjangan berikutnya diproses otomatis lewat
            notifikasi dari payment gateway.
          </p>
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-medium text-ink">Riwayat transaksi</h2>
        {subscriptions.length === 0 ? (
          <p className="mt-2 text-sm text-ink-subtle">Belum ada riwayat pembayaran.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-ink-subtle">
                <th className="pb-2 font-medium">Tanggal</th>
                <th className="pb-2 font-medium">Paket</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((s) => (
                <tr key={s.id} className="border-b border-line">
                  <td className="py-2">{formatTanggal(s.createdAt)}</td>
                  <td className="py-2 capitalize">{s.planName}</td>
                  <td className="py-2">
                    {SUBSCRIPTION_STATUS_LABEL[s.status] ?? s.status}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
