"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  formatDuration,
  formatServicePrice,
  groupByCategory,
} from "@/lib/services";
import {
  HONEYPOT_FIELD,
  MAX_ADVANCE_DAYS,
  MAX_CUSTOMER_NAME_LENGTH,
} from "@/lib/booking-limits";
import { BOOKING_NOTES_MAX_LENGTH } from "@/lib/booking-notes";
import { PHONE_ERROR, normalizePhone } from "@/lib/phone";
import { addDaysToDateString } from "@/lib/schedule";
import { jakartaDateStringNow } from "@/lib/tz";

type Service = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  durationMin: number;
  price: number;
  priceFrom: boolean;
};
type Staff = { id: string; name: string };
type Slot = { startTime: string; available: boolean };

// Tanggal "hari ini" versi WIB — sama dengan yang dipakai server buat nentuin
// slot, bukan tanggal di HP pelanggan (dan biar server/client render sama).
function todayStr() {
  return jakartaDateStringNow();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-2.5">
      <dt className="shrink-0 text-ink-subtle">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-ink">
        {children}
      </dd>
    </div>
  );
}

export function PublicBookingForm({
  outletSlug,
  services,
  staffList,
}: {
  outletSlug: string;
  services: Service[];
  staffList: Staff[];
}) {
  const serviceGroups = useMemo(() => groupByCategory(services), [services]);
  // Default ke layanan pertama yang kelihatan di layar (urutan tampilan
  // dikelompokkan per kategori, jadi belum tentu sama dengan services[0]).
  const [serviceId, setServiceId] = useState(
    () => serviceGroups[0]?.items[0]?.id ?? "",
  );
  const [staffId, setStaffId] = useState(""); // "" = staf manapun
  const [date, setDate] = useState(todayStr());

  const [slots, setSlots] = useState<Slot[]>([]);
  // Alasan kosongnya jam dari server (outlet tutup, staff libur) — biar
  // pelanggan nggak cuma lihat "nggak ada jam kosong" tanpa penjelasan.
  const [slotsNotice, setSlotsNotice] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  // Kolom jebakan buat bot — disembunyikan, orang nggak pernah ngisinya.
  const [honeypot, setHoneypot] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successAt, setSuccessAt] = useState<string | null>(null);
  // false = booking tercatat tapi WA konfirmasi gagal terkirim.
  const [notified, setNotified] = useState(true);
  // Pop up "cek lagi datanya" — muncul setelah klik Booking, booking baru
  // dikirim ke server kalau pelanggan menekan "Ya, sudah benar".
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  async function loadSlots() {
    setLoadingSlots(true);
    setSelectedSlot(null);

    const query = new URLSearchParams({ serviceId, date });
    if (staffId) query.set("staffId", staffId);

    const res = await fetch(`/api/public/${outletSlug}/slots?${query.toString()}`);
    const data = await res.json();
    setSlots(data.slots ?? []);
    setSlotsNotice(data.notice ?? null);
    setLoadingSlots(false);
  }

  useEffect(() => {
    // serviceId & date selalu ada nilainya (serviceId default ke layanan
    // pertama, date default ke hari ini), jadi ini cuma jaga-jaga.
    if (!serviceId || !date) return;
    loadSlots();
  }, [outletSlug, serviceId, staffId, date]);

  useEffect(() => {
    if (!confirmOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) setConfirmOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [confirmOpen, submitting]);

  // Klik "Booking sekarang": cek isian dulu, kalau lolos buka pop up
  // konfirmasi — belum ada request ke server di tahap ini.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedSlot) {
      setError("Pilih jam dulu ya.");
      return;
    }
    if (!name.trim() || !phone.trim()) {
      setError("Nama dan no. HP wajib diisi.");
      return;
    }
    if (!normalizePhone(phone)) {
      setError(PHONE_ERROR);
      return;
    }

    setConfirmOpen(true);
  }

  function closeConfirm() {
    if (submitting) return;
    setConfirmOpen(false);
    submitButtonRef.current?.focus();
  }

  // "Ya, sudah benar" di pop up — baru di sini booking beneran dikirim.
  async function handleConfirm() {
    if (!selectedSlot) return;

    setError(null);
    setSubmitting(true);

    // fetch/parsing dibungkus try/catch: server bisa aja balikin body kosong
    // atau bukan JSON (koneksi putus, dev server lagi compile ulang, gateway
    // timeout, dst) — bukan cuma error terduga (400/409) yang bentuknya
    // { error }. Tanpa ini, kegagalan semacam itu nge-throw lolos dari fungsi
    // (submitting nyangkut true, dan di dev muncul overlay crash bukannya
    // pesan error yang ramah).
    let res: Response;
    let data: { error?: string; notified?: boolean } = {};
    try {
      res = await fetch(`/api/public/${outletSlug}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          staffId: staffId || null,
          startTime: selectedSlot,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          notes: notes.trim() || undefined,
          [HONEYPOT_FIELD]: honeypot,
        }),
      });
      // .catch(() => ({})): body kosong/bukan JSON dianggap sama kayak nggak
      // ada pesan error spesifik, jatuh ke fallback di bawah — bukan crash.
      data = await res.json().catch(() => ({}));
    } catch {
      setSubmitting(false);
      setConfirmOpen(false);
      setError("Gagal terhubung ke server, coba lagi ya.");
      return;
    }

    setSubmitting(false);
    // Sukses atau gagal, pop up ditutup: kalau gagal (mis. jam baru aja
    // kepakai orang lain) pesan errornya tampil di form, di atas tombol.
    setConfirmOpen(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal bikin booking, coba lagi ya.");
      return;
    }

    setNotified(data.notified !== false);
    setSuccessAt(selectedSlot);
  }

  function resetForm() {
    setSuccessAt(null);
    setSelectedSlot(null);
    setName("");
    setPhone("");
    setNotes("");
  }

  if (successAt) {
    return (
      <div className="mt-8 rounded-lg border border-ok-line bg-ok-soft p-6 text-center">
        <p className="text-sm font-medium text-ok">
          Booking kamu diterima!
        </p>
        <p className="mt-2 text-sm text-ok">
          {formatTime(successAt)} di{" "}
          {new Date(successAt).toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "Asia/Jakarta",
          })}
          .
          {notified &&
            " Konfirmasi udah dikirim ke WhatsApp kamu — outlet bakal konfirmasi ulang sebelum jadwalnya."}
        </p>
        {!notified && (
          <p className="mt-2 text-sm text-warn">
            Pesan konfirmasi ke WhatsApp belum berhasil terkirim, tapi booking
            kamu tetap tercatat. Outlet akan menghubungi kamu untuk konfirmasi
            jadwal.
          </p>
        )}
        <button
          onClick={resetForm}
          className="mt-4 text-sm font-medium text-ok underline underline-offset-4"
        >
          Booking lagi
        </button>
      </div>
    );
  }

  const selectedService = services.find((s) => s.id === serviceId);
  // Label kelompok cuma perlu kalau memang ada yang dikategorikan; kalau
  // semuanya "Lainnya", labelnya cuma nambah noise.
  const showGroupLabels = serviceGroups.some((g) => g.category !== null);

  const selectedStaff = staffList.find((s) => s.id === staffId);

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <fieldset>
        <legend className="block text-sm font-medium text-ink">Layanan</legend>
        <div className="mt-2 space-y-5">
          {serviceGroups.map((group) => (
            <div key={group.key}>
              {showGroupLabels && (
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.09em] text-ink-faint">
                  {group.label}
                </p>
              )}
              <div className="space-y-2">
                {group.items.map((s) => {
                  const selected = s.id === serviceId;
                  return (
                    <label
                      key={s.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-accent/60 ${
                        selected
                          ? "border-accent bg-accent-soft"
                          : "border-line-strong hover:bg-surface-2"
                      }`}
                    >
                      <input
                        type="radio"
                        name="service"
                        value={s.id}
                        checked={selected}
                        onChange={() => setServiceId(s.id)}
                        className="sr-only"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-ink">
                          {s.name}
                        </span>
                        {s.description && (
                          <span className="mt-0.5 block text-xs text-ink-subtle">
                            {s.description}
                          </span>
                        )}
                        <span className="mt-1 block text-xs text-ink-muted">
                          {formatDuration(s.durationMin)}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-medium text-ink">
                        {formatServicePrice(s.price, s.priceFrom)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      {staffList.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-ink">
            Staff (opsional)
          </label>
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
          >
            <option value="">Staf manapun</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-ink">
          Tanggal
        </label>
        <input
          required
          type="date"
          min={todayStr()}
          max={addDaysToDateString(todayStr(), MAX_ADVANCE_DAYS)}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
        />
      </div>

      <div>
        <p className="block text-sm font-medium text-ink">
          Jam tersedia
        </p>
        {loadingSlots ? (
          <p className="mt-2 text-sm text-ink-faint">Memuat jam kosong...</p>
        ) : slots.length === 0 ? (
          <p
            className={`mt-2 text-sm ${slotsNotice ? "text-warn" : "text-ink-faint"}`}
          >
            {slotsNotice ?? "Nggak ada jam kosong di tanggal ini."}
          </p>
        ) : (
          <div className="mt-2 grid grid-cols-4 gap-2">
            {slots.map((slot) => (
              <button
                key={slot.startTime}
                type="button"
                disabled={!slot.available}
                onClick={() => setSelectedSlot(slot.startTime)}
                className={`rounded-md border px-2 py-2 text-sm ${
                  selectedSlot === slot.startTime
                    ? "border-accent bg-accent text-on-accent"
                    : slot.available
                      ? "border-line-strong text-ink hover:bg-surface-2"
                      : "cursor-not-allowed border-line text-ink-faint line-through"
                }`}
              >
                {formatTime(slot.startTime)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-line pt-6">
        <div>
          <label className="block text-sm font-medium text-ink">
            Nama
          </label>
          <input
            required
            type="text"
            maxLength={MAX_CUSTOMER_NAME_LENGTH}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink">
            No. WhatsApp
          </label>
          <input
            required
            type="tel"
            placeholder="08xxxxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
          />
          <p className="mt-1 text-xs text-ink-subtle">
            Konfirmasi booking dikirim ke nomor ini.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink">
            Catatan (opsional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={BOOKING_NOTES_MAX_LENGTH}
            className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
          />
          <p className="mt-1 text-xs text-ink-subtle">
            Khusus untuk kunjungan ini, mis. model rambut atau warna yang
            diinginkan.
          </p>
        </div>
      </div>

      {/* Honeypot: di luar layar, nggak bisa di-tab, nggak dibaca screen reader. */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}
      >
        <label>
          Jangan diisi
          <input
            type="text"
            name={HONEYPOT_FIELD}
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        ref={submitButtonRef}
        type="submit"
        disabled={submitting || !selectedSlot}
        className="w-full rounded-md bg-accent px-4 py-3 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
      >
        {submitting
          ? "Memproses..."
          : selectedService
            ? `Booking sekarang — ${formatServicePrice(selectedService.price, selectedService.priceFrom)}`
            : "Booking sekarang"}
      </button>

      {confirmOpen &&
        selectedSlot &&
        createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeConfirm}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-booking-title"
            onClick={(e) => e.stopPropagation()}
            className="max-h-full w-full max-w-md overflow-y-auto rounded-xl border border-line bg-surface p-5 shadow-xl"
          >
            <h2
              id="confirm-booking-title"
              className="text-base font-semibold text-ink"
            >
              Cek lagi data booking kamu
            </h2>
            <p className="mt-1 text-sm text-ink-subtle">
              Pastikan semuanya sudah benar. Konfirmasi dikirim ke WhatsApp di
              nomor yang kamu isi.
            </p>

            <dl className="mt-4 divide-y divide-line rounded-lg border border-line text-sm">
              <SummaryRow label="Layanan">
                {selectedService ? (
                  <>
                    {selectedService.name}
                    <span className="mt-0.5 block text-xs font-normal text-ink-muted">
                      {formatDuration(selectedService.durationMin)} ·{" "}
                      {formatServicePrice(
                        selectedService.price,
                        selectedService.priceFrom,
                      )}
                    </span>
                  </>
                ) : (
                  "—"
                )}
              </SummaryRow>
              {staffList.length > 0 && (
                <SummaryRow label="Staff">
                  {selectedStaff ? selectedStaff.name : "Staf manapun"}
                </SummaryRow>
              )}
              <SummaryRow label="Tanggal">{formatDateLong(selectedSlot)}</SummaryRow>
              <SummaryRow label="Jam">{formatTime(selectedSlot)}</SummaryRow>
              <SummaryRow label="Nama">{name.trim()}</SummaryRow>
              <SummaryRow label="No. WhatsApp">{phone.trim()}</SummaryRow>
              {notes.trim() && (
                <SummaryRow label="Catatan">
                  <span className="whitespace-pre-wrap font-normal">
                    {notes.trim()}
                  </span>
                </SummaryRow>
              )}
            </dl>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={closeConfirm}
                disabled={submitting}
                className="flex-1 rounded-md border border-line-strong px-4 py-2.5 text-sm font-medium text-ink-muted hover:bg-surface-2 disabled:opacity-50"
              >
                Ubah data
              </button>
              <button
                type="button"
                autoFocus
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
              >
                {submitting ? "Memproses..." : "Ya, sudah benar"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </form>
  );
}
