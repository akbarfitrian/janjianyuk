"use client";

import { useEffect, useState } from "react";

type Booking = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  customer: { id: string; name: string; phone: string };
  service: { id: string; name: string; durationMin: number; price: number };
  staff: { id: string; name: string } | null;
};

type Customer = { id: string; name: string; phone: string };
type Service = { id: string; name: string; durationMin: number; price: number };
type Staff = { id: string; name: string };

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  confirmed: "Dikonfirmasi",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  no_show: "Tidak datang",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-warn-soft text-warn",
  confirmed: "bg-info-soft text-info",
  completed: "bg-ok-soft text-ok",
  cancelled: "bg-line text-ink-muted",
  no_show: "bg-danger-soft text-danger",
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, delta: number) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BookingsPage() {
  const [date, setDate] = useState(todayStr());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    customerId: "",
    serviceId: "",
    staffId: "",
    time: "10:00",
  });

  async function loadOptions() {
    const [customersRes, servicesRes, staffRes] = await Promise.all([
      fetch("/api/customers"),
      fetch("/api/services"),
      fetch("/api/staff"),
    ]);
    const [customersData, servicesData, staffData] = await Promise.all([
      customersRes.json(),
      servicesRes.json(),
      staffRes.json(),
    ]);
    setCustomers(customersData.customers ?? []);
    setServices(servicesData.services ?? []);
    setStaffList(staffData.staff ?? []);
  }

  async function loadBookings(forDate: string) {
    setIsLoading(true);
    const res = await fetch(`/api/bookings?date=${forDate}`);
    const data = await res.json();
    setBookings(data.bookings ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    loadBookings(date);
  }, [date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.customerId || !form.serviceId) {
      setError("Pelanggan dan layanan wajib dipilih.");
      return;
    }

    setIsSubmitting(true);

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: form.customerId,
        serviceId: form.serviceId,
        staffId: form.staffId || null,
        startTime: `${date}T${form.time}:00`,
      }),
    });
    const data = await res.json();

    setIsSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal membuat booking.");
      return;
    }

    setForm({ customerId: "", serviceId: "", staffId: "", time: "10:00" });
    setShowForm(false);
    await loadBookings(date);
  }

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await loadBookings(date);
    } else {
      const data = await res.json();
      alert(data.error ?? "Gagal mengubah status.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus booking ini?")) return;
    const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadBookings(date);
    } else {
      const data = await res.json();
      alert(data.error ?? "Gagal menghapus booking.");
    }
  }

  const isToday = date === todayStr();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Booking</h1>
          <p className="mt-1 text-sm text-ink-subtle">
            Kalender booking harian — booking dari halaman publik masuk
            otomatis dengan status &quot;Menunggu&quot;, atau tambahin
            manual dari sini.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover"
        >
          {showForm ? "Tutup form" : "+ Booking baru"}
        </button>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => setDate((d) => addDays(d, -1))}
          className="rounded-md border border-line-strong px-3 py-2 text-sm hover:bg-surface-2"
        >
          ← Sebelumnya
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
        />
        {!isToday && (
          <button
            onClick={() => setDate(todayStr())}
            className="text-sm text-ink-muted underline underline-offset-4"
          >
            Hari ini
          </button>
        )}
        <button
          onClick={() => setDate((d) => addDays(d, 1))}
          className="rounded-md border border-line-strong px-3 py-2 text-sm hover:bg-surface-2"
        >
          Selanjutnya →
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-line p-4"
        >
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-ink">
              Pelanggan
            </label>
            <select
              required
              value={form.customerId}
              onChange={(e) =>
                setForm((f) => ({ ...f, customerId: e.target.value }))
              }
              className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
            >
              <option value="">Pilih pelanggan</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.phone}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-ink">
              Layanan
            </label>
            <select
              required
              value={form.serviceId}
              onChange={(e) =>
                setForm((f) => ({ ...f, serviceId: e.target.value }))
              }
              className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
            >
              <option value="">Pilih layanan</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.durationMin} menit)
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="block text-sm font-medium text-ink">
              Staff (opsional)
            </label>
            <select
              value={form.staffId}
              onChange={(e) =>
                setForm((f) => ({ ...f, staffId: e.target.value }))
              }
              className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
            >
              <option value="">Tanpa staff tertentu</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-ink">
              Jam mulai
            </label>
            <input
              required
              type="time"
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
          >
            Simpan booking
          </button>

          {customers.length === 0 || services.length === 0 ? (
            <p className="w-full text-sm text-warn">
              Tambahin minimal 1 pelanggan dan 1 layanan dulu sebelum bikin
              booking.
            </p>
          ) : null}
        </form>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-ink-subtle">
            <tr>
              <th className="px-4 py-2 font-medium">Jam</th>
              <th className="px-4 py-2 font-medium">Pelanggan</th>
              <th className="px-4 py-2 font-medium">Layanan</th>
              <th className="px-4 py-2 font-medium">Staff</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-faint">
                  Memuat...
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-faint">
                  Belum ada booking di tanggal ini.
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="px-4 py-3 text-ink">
                    {formatTime(booking.startTime)}–{formatTime(booking.endTime)}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {booking.customer.name}
                    <span className="block text-xs text-ink-subtle">
                      {booking.customer.phone}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {booking.service.name}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {booking.staff?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={booking.status}
                      onChange={(e) =>
                        handleStatusChange(booking.id, e.target.value)
                      }
                      className={`rounded-full border-0 px-2 py-1 text-xs font-medium ${STATUS_COLOR[booking.status] ?? "bg-surface-2 text-ink-muted"}`}
                    >
                      {Object.entries(STATUS_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(booking.id)}
                      className="text-danger underline underline-offset-4 hover:text-danger"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
