"use client";

import { useState } from "react";

const inputClass =
  "mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none";

export function HoursPanel({
  openTime,
  closeTime,
  breakStartTime,
  breakEndTime,
}: {
  openTime: string;
  closeTime: string;
  breakStartTime: string | null;
  breakEndTime: string | null;
}) {
  const [form, setForm] = useState({
    openTime,
    closeTime,
    // Prefill jam istirahat dengan nilai wajar walau outlet belum pernah
    // ngisi, biar pas dicentang nggak nongol input time kosong.
    breakStartTime: breakStartTime ?? "12:00",
    breakEndTime: breakEndTime ?? "13:00",
  });
  const [hasBreak, setHasBreak] = useState(
    breakStartTime !== null && breakEndTime !== null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setIsSaving(true);

    const res = await fetch("/api/outlet/hours", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        openTime: form.openTime,
        closeTime: form.closeTime,
        breakStartTime: hasBreak ? form.breakStartTime : null,
        breakEndTime: hasBreak ? form.breakEndTime : null,
      }),
    });
    const data = await res.json().catch(() => ({}));

    setIsSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal menyimpan jam operasional.");
      return;
    }

    setSaved(true);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Jam Operasional</h1>
      <p className="mt-1 text-sm text-ink-subtle">
        Jam buka, istirahat, dan tutup di sini yang dipakai buat nentuin jam
        kosong yang muncul di halaman booking publik outlet kamu.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 max-w-md space-y-5 rounded-lg border border-line p-5"
      >
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="openTime" className="block text-sm font-medium text-ink">
              Jam buka
            </label>
            <input
              id="openTime"
              type="time"
              required
              value={form.openTime}
              onChange={(e) =>
                setForm((f) => ({ ...f, openTime: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div className="flex-1">
            <label htmlFor="closeTime" className="block text-sm font-medium text-ink">
              Jam tutup
            </label>
            <input
              id="closeTime"
              type="time"
              required
              value={form.closeTime}
              onChange={(e) =>
                setForm((f) => ({ ...f, closeTime: e.target.value }))
              }
              className={inputClass}
            />
          </div>
        </div>

        <div className="border-t border-line pt-4">
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={hasBreak}
              onChange={(e) => setHasBreak(e.target.checked)}
              className="h-4 w-4 rounded border-line-strong accent-accent"
            />
            Outlet ambil jam istirahat
          </label>

          {hasBreak && (
            <div className="mt-3 flex gap-4">
              <div className="flex-1">
                <label
                  htmlFor="breakStartTime"
                  className="block text-sm font-medium text-ink"
                >
                  Mulai istirahat
                </label>
                <input
                  id="breakStartTime"
                  type="time"
                  required={hasBreak}
                  value={form.breakStartTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, breakStartTime: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="breakEndTime"
                  className="block text-sm font-medium text-ink"
                >
                  Selesai istirahat
                </label>
                <input
                  id="breakEndTime"
                  type="time"
                  required={hasBreak}
                  value={form.breakEndTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, breakEndTime: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {saved && !error && (
          <p className="text-sm text-ok">Jam operasional tersimpan.</p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
        >
          {isSaving ? "Menyimpan..." : "Simpan"}
        </button>
      </form>
    </div>
  );
}
