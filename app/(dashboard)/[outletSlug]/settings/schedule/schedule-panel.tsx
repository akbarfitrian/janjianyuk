"use client";

import { useState } from "react";

import {
  MAX_REASON_LENGTH,
  WEEKDAY_DISPLAY_ORDER,
  WEEKDAY_LABELS,
} from "@/lib/schedule";

type Closure = { id: string; date: string; reason: string | null };
type StaffMember = { id: string; name: string };
type TimeOff = {
  id: string;
  staffId: string;
  date: string;
  reason: string | null;
};

const inputClass =
  "mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none";
const primaryButton =
  "rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50";

// "2026-09-25" → "Jum, 25 Sep 2026". Dihitung dari kalender (UTC) supaya
// harinya nggak geser oleh timezone browser.
function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function bookingWarning(count: number) {
  return `Ada ${count} booking aktif di tanggal itu. Booking-nya nggak dibatalkan otomatis — hubungi pelanggannya atau ubah statusnya di menu Booking.`;
}

function ReasonField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="min-w-[160px] flex-1">
      <label className="block text-sm font-medium text-ink">
        Alasan (opsional)
      </label>
      <input
        type="text"
        maxLength={MAX_REASON_LENGTH}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="mis. Lebaran"
        className={inputClass}
      />
    </div>
  );
}

export function SchedulePanel({
  initialClosedWeekdays,
  initialClosures,
  staff,
  initialTimeOffs,
}: {
  initialClosedWeekdays: number[];
  initialClosures: Closure[];
  staff: StaffMember[];
  initialTimeOffs: TimeOff[];
}) {
  // ---- hari tutup mingguan
  const [closedWeekdays, setClosedWeekdays] = useState(initialClosedWeekdays);
  const [weekdaysSaving, setWeekdaysSaving] = useState(false);
  const [weekdaysMsg, setWeekdaysMsg] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);

  function toggleWeekday(day: number) {
    setWeekdaysMsg(null);
    setClosedWeekdays((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day],
    );
  }

  async function saveWeekdays() {
    setWeekdaysMsg(null);
    setWeekdaysSaving(true);
    const res = await fetch("/api/outlet/closed-weekdays", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekdays: closedWeekdays }),
    });
    const data = await res.json().catch(() => ({}));
    setWeekdaysSaving(false);

    if (!res.ok) {
      setWeekdaysMsg({
        kind: "error",
        text: data.error ?? "Gagal menyimpan hari tutup.",
      });
      return;
    }
    setClosedWeekdays(data.closedWeekdays);
    setWeekdaysMsg({ kind: "ok", text: "Hari tutup tersimpan." });
  }

  // ---- tanggal libur outlet
  const [closures, setClosures] = useState(initialClosures);
  const [closureForm, setClosureForm] = useState({
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [closureSaving, setClosureSaving] = useState(false);
  const [closureError, setClosureError] = useState<string | null>(null);
  const [closureWarning, setClosureWarning] = useState<string | null>(null);

  async function addClosure(e: React.FormEvent) {
    e.preventDefault();
    setClosureError(null);
    setClosureWarning(null);
    setClosureSaving(true);

    const res = await fetch("/api/outlet/closures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: closureForm.startDate,
        endDate: closureForm.endDate || undefined,
        reason: closureForm.reason,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setClosureSaving(false);

    if (!res.ok) {
      setClosureError(data.error ?? "Gagal menambah tanggal libur.");
      return;
    }

    const added: Closure[] = data.closures;
    setClosures((current) =>
      [...current.filter((c) => !added.some((a) => a.id === c.id)), ...added].sort(
        (a, b) => a.date.localeCompare(b.date),
      ),
    );
    setClosureForm({ startDate: "", endDate: "", reason: "" });
    if (data.existingBookings > 0) {
      setClosureWarning(bookingWarning(data.existingBookings));
    }
  }

  async function removeClosure(id: string) {
    setClosureError(null);
    const res = await fetch(`/api/outlet/closures/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setClosureError(data.error ?? "Gagal menghapus tanggal libur.");
      return;
    }
    setClosures((current) => current.filter((c) => c.id !== id));
  }

  // ---- cuti staff
  const [timeOffs, setTimeOffs] = useState(initialTimeOffs);
  const [timeOffForm, setTimeOffForm] = useState({
    staffId: staff[0]?.id ?? "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [timeOffSaving, setTimeOffSaving] = useState(false);
  const [timeOffError, setTimeOffError] = useState<string | null>(null);
  const [timeOffWarning, setTimeOffWarning] = useState<string | null>(null);

  async function addTimeOff(e: React.FormEvent) {
    e.preventDefault();
    setTimeOffError(null);
    setTimeOffWarning(null);
    setTimeOffSaving(true);

    const res = await fetch("/api/staff-time-off", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staffId: timeOffForm.staffId,
        startDate: timeOffForm.startDate,
        endDate: timeOffForm.endDate || undefined,
        reason: timeOffForm.reason,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setTimeOffSaving(false);

    if (!res.ok) {
      setTimeOffError(data.error ?? "Gagal mencatat cuti.");
      return;
    }

    const added: TimeOff[] = data.timeOffs;
    setTimeOffs((current) =>
      [...current.filter((t) => !added.some((a) => a.id === t.id)), ...added].sort(
        (a, b) => a.date.localeCompare(b.date),
      ),
    );
    setTimeOffForm((f) => ({ ...f, startDate: "", endDate: "", reason: "" }));
    if (data.existingBookings > 0) {
      setTimeOffWarning(bookingWarning(data.existingBookings));
    }
  }

  async function removeTimeOff(id: string) {
    setTimeOffError(null);
    const res = await fetch(`/api/staff-time-off/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setTimeOffError(data.error ?? "Gagal menghapus data cuti.");
      return;
    }
    setTimeOffs((current) => current.filter((t) => t.id !== id));
  }

  const staffName = (id: string) =>
    staff.find((s) => s.id === id)?.name ?? "Staff";

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-ink">Libur &amp; Cuti</h1>
      <p className="mt-1 text-sm text-ink-subtle">
        Hari tutup outlet, tanggal libur, dan cuti staff. Di tanggal-tanggal ini
        jam kosong nggak muncul di halaman booking publik.
      </p>

      {/* Hari tutup mingguan */}
      <section className="mt-6 space-y-4 rounded-lg border border-line p-5">
        <div>
          <h2 className="text-sm font-semibold text-ink">
            Hari tutup mingguan
          </h2>
          <p className="mt-1 text-sm text-ink-subtle">
            Outlet tutup setiap hari yang dicentang.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {WEEKDAY_DISPLAY_ORDER.map((day) => (
            <label
              key={day}
              className="flex items-center gap-2 text-sm text-ink"
            >
              <input
                type="checkbox"
                checked={closedWeekdays.includes(day)}
                onChange={() => toggleWeekday(day)}
                className="h-4 w-4 rounded border-line-strong accent-accent"
              />
              {WEEKDAY_LABELS[day]}
            </label>
          ))}
        </div>
        {weekdaysMsg && (
          <p
            className={`text-sm ${weekdaysMsg.kind === "ok" ? "text-ok" : "text-danger"}`}
          >
            {weekdaysMsg.text}
          </p>
        )}
        <button
          type="button"
          onClick={saveWeekdays}
          disabled={weekdaysSaving}
          className={primaryButton}
        >
          {weekdaysSaving ? "Menyimpan..." : "Simpan hari tutup"}
        </button>
      </section>

      {/* Tanggal libur outlet */}
      <section className="mt-6 space-y-4 rounded-lg border border-line p-5">
        <div>
          <h2 className="text-sm font-semibold text-ink">
            Tanggal libur outlet
          </h2>
          <p className="mt-1 text-sm text-ink-subtle">
            Tanggal merah, Lebaran, renovasi, dan sejenisnya. Isi &quot;sampai
            tanggal&quot; kalau liburnya beberapa hari.
          </p>
        </div>

        <form onSubmit={addClosure} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-ink">
              Dari tanggal
            </label>
            <input
              required
              type="date"
              value={closureForm.startDate}
              onChange={(e) =>
                setClosureForm((f) => ({ ...f, startDate: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink">
              Sampai tanggal (opsional)
            </label>
            <input
              type="date"
              value={closureForm.endDate}
              min={closureForm.startDate || undefined}
              onChange={(e) =>
                setClosureForm((f) => ({ ...f, endDate: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <ReasonField
            value={closureForm.reason}
            onChange={(reason) => setClosureForm((f) => ({ ...f, reason }))}
          />
          <button type="submit" disabled={closureSaving} className={primaryButton}>
            {closureSaving ? "Menyimpan..." : "Tambah"}
          </button>
        </form>

        {closureError && <p className="text-sm text-danger">{closureError}</p>}
        {closureWarning && <p className="text-sm text-warn">{closureWarning}</p>}

        {closures.length === 0 ? (
          <p className="text-sm text-ink-faint">
            Belum ada tanggal libur yang akan datang.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-md border border-line text-sm">
            {closures.map((closure) => (
              <li
                key={closure.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <span className="text-ink">
                  {formatDate(closure.date)}
                  {closure.reason && (
                    <span className="ml-2 text-ink-subtle">
                      {closure.reason}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => removeClosure(closure.id)}
                  className="text-danger underline underline-offset-4"
                >
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Cuti staff */}
      <section className="mt-6 space-y-4 rounded-lg border border-line p-5">
        <div>
          <h2 className="text-sm font-semibold text-ink">Cuti staff</h2>
          <p className="mt-1 text-sm text-ink-subtle">
            Staff yang cuti nggak ditawarkan di tanggal itu. Kalau pelanggan
            memilih &quot;staf manapun&quot;, hanya staff yang masuk yang dipilih.
          </p>
        </div>

        {staff.length === 0 ? (
          <p className="text-sm text-ink-faint">
            Belum ada staff. Tambah staff dulu di menu Staff.
          </p>
        ) : (
          <form onSubmit={addTimeOff} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[140px]">
              <label className="block text-sm font-medium text-ink">Staff</label>
              <select
                required
                value={timeOffForm.staffId}
                onChange={(e) =>
                  setTimeOffForm((f) => ({ ...f, staffId: e.target.value }))
                }
                className={inputClass}
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">
                Dari tanggal
              </label>
              <input
                required
                type="date"
                value={timeOffForm.startDate}
                onChange={(e) =>
                  setTimeOffForm((f) => ({ ...f, startDate: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">
                Sampai tanggal (opsional)
              </label>
              <input
                type="date"
                value={timeOffForm.endDate}
                min={timeOffForm.startDate || undefined}
                onChange={(e) =>
                  setTimeOffForm((f) => ({ ...f, endDate: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <ReasonField
              value={timeOffForm.reason}
              onChange={(reason) => setTimeOffForm((f) => ({ ...f, reason }))}
            />
            <button
              type="submit"
              disabled={timeOffSaving}
              className={primaryButton}
            >
              {timeOffSaving ? "Menyimpan..." : "Tambah"}
            </button>
          </form>
        )}

        {timeOffError && <p className="text-sm text-danger">{timeOffError}</p>}
        {timeOffWarning && <p className="text-sm text-warn">{timeOffWarning}</p>}

        {staff.length > 0 &&
          (timeOffs.length === 0 ? (
            <p className="text-sm text-ink-faint">
              Belum ada cuti staff yang akan datang.
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-md border border-line text-sm">
              {timeOffs.map((timeOff) => (
                <li
                  key={timeOff.id}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <span className="text-ink">
                    <span className="font-medium">
                      {staffName(timeOff.staffId)}
                    </span>
                    <span className="ml-2">{formatDate(timeOff.date)}</span>
                    {timeOff.reason && (
                      <span className="ml-2 text-ink-subtle">
                        {timeOff.reason}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeTimeOff(timeOff.id)}
                    className="text-danger underline underline-offset-4"
                  >
                    Hapus
                  </button>
                </li>
              ))}
            </ul>
          ))}
      </section>
    </div>
  );
}
