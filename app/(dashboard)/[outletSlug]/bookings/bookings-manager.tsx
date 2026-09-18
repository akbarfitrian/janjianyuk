"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createBooking, deleteBooking, updateBookingStatus } from "./actions";

type BookingItem = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  customerName: string;
  serviceName: string;
  staffName: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  confirmed: "Terkonfirmasi",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  no_show: "Tidak hadir",
};

const timeFormat = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
});
const dateHeadingFormat = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const inputClass =
  "mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none";

export function BookingsManager({
  outletSlug,
  selectedDateParam,
  prevDateParam,
  nextDateParam,
  bookings,
  customers,
  services,
  staff,
}: {
  outletSlug: string;
  selectedDateParam: string;
  prevDateParam: string;
  nextDateParam: string;
  bookings: BookingItem[];
  customers: { id: string; name: string; phone: string }[];
  services: { id: string; name: string; durationMin: number }[];
  staff: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const canCreate = customers.length > 0 && services.length > 0;
  const selectedDate = new Date(`${selectedDateParam}T00:00:00`);

  function handleCreate(formData: FormData) {
    setFormError(null);
    startTransition(async () => {
      const result = await createBooking(outletSlug, formData);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      (
        document.getElementById("create-booking-form") as HTMLFormElement | null
      )?.reset();
      router.refresh();
    });
  }

  function handleStatusChange(bookingId: string, status: string) {
    setFormError(null);
    startTransition(async () => {
      const result = await updateBookingStatus(outletSlug, bookingId, status);
      if (result.error) setFormError(result.error);
      router.refresh();
    });
  }

  function handleDelete(bookingId: string) {
    if (!confirm("Hapus booking ini?")) return;
    setFormError(null);
    startTransition(async () => {
      const result = await deleteBooking(outletSlug, bookingId);
      if (result.error) setFormError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`?date=${prevDateParam}`}
          className="rounded-md border border-line-strong px-3 py-1.5 text-sm hover:bg-surface-2"
        >
          ← Sebelumnya
        </Link>
        <p className="text-sm font-medium text-ink">
          {dateHeadingFormat.format(selectedDate)}
        </p>
        <Link
          href={`?date=${nextDateParam}`}
          className="rounded-md border border-line-strong px-3 py-1.5 text-sm hover:bg-surface-2"
        >
          Berikutnya →
        </Link>
      </div>

      {canCreate ? (
        <form
          id="create-booking-form"
          action={handleCreate}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-line p-4"
        >
          <div className="min-w-[180px] flex-1">
            <label htmlFor="customerId" className="block text-sm font-medium text-ink">
              Pelanggan
            </label>
            <select id="customerId" name="customerId" required className={inputClass}>
              <option value="">Pilih pelanggan</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.phone}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[180px] flex-1">
            <label htmlFor="serviceId" className="block text-sm font-medium text-ink">
              Layanan
            </label>
            <select id="serviceId" name="serviceId" required className={inputClass}>
              <option value="">Pilih layanan</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.durationMin} menit)
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px] flex-1">
            <label htmlFor="staffId" className="block text-sm font-medium text-ink">
              Staff (opsional)
            </label>
            <select id="staffId" name="staffId" className={inputClass}>
              <option value="">Tanpa staff tertentu</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[200px]">
            <label htmlFor="startTime" className="block text-sm font-medium text-ink">
              Waktu mulai
            </label>
            <input
              id="startTime"
              name="startTime"
              type="datetime-local"
              required
              defaultValue={`${selectedDateParam}T09:00`}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
          >
            Tambah booking
          </button>
        </form>
      ) : (
        <div className="rounded-lg border border-dashed border-line-strong p-6 text-center text-sm text-ink-subtle">
          Tambahkan minimal satu layanan dan satu pelanggan dulu sebelum bisa
          bikin booking.
        </div>
      )}

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-2 text-ink-subtle">
            <tr>
              <th className="px-4 py-2 font-medium">Jam</th>
              <th className="px-4 py-2 font-medium">Pelanggan</th>
              <th className="px-4 py-2 font-medium">Layanan</th>
              <th className="px-4 py-2 font-medium">Staff</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {bookings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-subtle">
                  Belum ada booking di tanggal ini.
                </td>
              </tr>
            )}
            {bookings.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3 text-ink">
                  {timeFormat.format(new Date(b.startTime))}–
                  {timeFormat.format(new Date(b.endTime))}
                </td>
                <td className="px-4 py-3 text-ink-muted">{b.customerName}</td>
                <td className="px-4 py-3 text-ink-muted">{b.serviceName}</td>
                <td className="px-4 py-3 text-ink-muted">{b.staffName ?? "—"}</td>
                <td className="px-4 py-3">
                  <select
                    value={b.status}
                    disabled={isPending}
                    onChange={(e) => handleStatusChange(b.id, e.target.value)}
                    className="rounded-md border border-line-strong px-2 py-1 text-xs focus:border-azure focus:outline-none"
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
                    onClick={() => handleDelete(b.id)}
                    disabled={isPending}
                    className="text-sm font-medium text-danger hover:underline disabled:opacity-50"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
