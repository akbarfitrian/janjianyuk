"use client";

import { useEffect, useState } from "react";

type Service = { id: string; name: string; durationMin: number; price: number };
type Staff = { id: string; name: string };
type Slot = { startTime: string; available: boolean };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
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
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [staffId, setStaffId] = useState(""); // "" = staf manapun
  const [date, setDate] = useState(todayStr());

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successAt, setSuccessAt] = useState<string | null>(null);

  async function loadSlots() {
    setLoadingSlots(true);
    setSelectedSlot(null);

    const query = new URLSearchParams({ serviceId, date });
    if (staffId) query.set("staffId", staffId);

    const res = await fetch(`/api/public/${outletSlug}/slots?${query.toString()}`);
    const data = await res.json();
    setSlots(data.slots ?? []);
    setLoadingSlots(false);
  }

  useEffect(() => {
    // serviceId & date selalu ada nilainya (serviceId default ke layanan
    // pertama, date default ke hari ini), jadi ini cuma jaga-jaga.
    if (!serviceId || !date) return;
    loadSlots();
  }, [outletSlug, serviceId, staffId, date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedSlot) {
      setError("Pilih jam dulu ya.");
      return;
    }
    if (!name || !phone) {
      setError("Nama dan no. HP wajib diisi.");
      return;
    }

    setSubmitting(true);

    const res = await fetch(`/api/public/${outletSlug}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        staffId: staffId || null,
        startTime: selectedSlot,
        customerName: name,
        customerPhone: phone,
        notes: notes || undefined,
      }),
    });
    const data = await res.json();

    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal bikin booking, coba lagi ya.");
      return;
    }

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
      <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-sm font-medium text-green-900">
          Booking kamu diterima!
        </p>
        <p className="mt-2 text-sm text-green-800">
          {formatTime(successAt)} di{" "}
          {new Date(successAt).toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          . Konfirmasi udah dikirim ke WhatsApp kamu — outlet bakal konfirmasi
          ulang sebelum jadwalnya.
        </p>
        <button
          onClick={resetForm}
          className="mt-4 text-sm font-medium text-green-900 underline underline-offset-4"
        >
          Booking lagi
        </button>
      </div>
    );
  }

  const selectedService = services.find((s) => s.id === serviceId);

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-900">
          Layanan
        </label>
        <select
          required
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.durationMin} menit — {formatRupiah(s.price)}
            </option>
          ))}
        </select>
      </div>

      {staffList.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-neutral-900">
            Staff (opsional)
          </label>
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
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
        <label className="block text-sm font-medium text-neutral-900">
          Tanggal
        </label>
        <input
          required
          type="date"
          min={todayStr()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
      </div>

      <div>
        <p className="block text-sm font-medium text-neutral-900">
          Jam tersedia
        </p>
        {loadingSlots ? (
          <p className="mt-2 text-sm text-neutral-400">Memuat jam kosong...</p>
        ) : slots.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">
            Nggak ada jam kosong di tanggal ini.
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
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : slot.available
                      ? "border-neutral-300 text-neutral-900 hover:bg-neutral-100"
                      : "cursor-not-allowed border-neutral-100 text-neutral-300 line-through"
                }`}
              >
                {formatTime(slot.startTime)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-neutral-200 pt-6">
        <div>
          <label className="block text-sm font-medium text-neutral-900">
            Nama
          </label>
          <input
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-900">
            No. WhatsApp
          </label>
          <input
            required
            type="tel"
            placeholder="08xxxxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Konfirmasi booking dikirim ke nomor ini.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-900">
            Catatan (opsional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !selectedSlot}
        className="w-full rounded-md bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {submitting
          ? "Memproses..."
          : selectedService
            ? `Booking sekarang — ${formatRupiah(selectedService.price)}`
            : "Booking sekarang"}
      </button>
    </form>
  );
}
