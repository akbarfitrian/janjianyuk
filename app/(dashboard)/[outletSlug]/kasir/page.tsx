"use client";

import { Fragment, useEffect, useState } from "react";

type Booking = {
  id: string;
  startTime: string;
  status: string;
  customer: { id: string; name: string };
  service: { id: string; name: string; price: number };
};

type Transaction = {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  booking: { id: string; customer: { name: string }; service: { name: string } };
};

type MonthlyReport = {
  month: string;
  monthTotal: number;
  monthCount: number;
  days: { date: string; total: number; count: number }[];
};

const METHOD_LABEL: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function thisMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTanggalPendek(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function KasirPage() {
  const [date, setDate] = useState(todayStr());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({ amount: "", method: "cash" });
  const [payError, setPayError] = useState<string | null>(null);
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  const [month, setMonth] = useState(thisMonthStr());
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(true);

  async function loadDay(forDate: string) {
    setIsLoading(true);
    const [bookingsRes, transactionsRes] = await Promise.all([
      fetch(`/api/bookings?date=${forDate}`),
      fetch(`/api/transactions?date=${forDate}`),
    ]);
    const [bookingsData, transactionsData] = await Promise.all([
      bookingsRes.json(),
      transactionsRes.json(),
    ]);
    setBookings(bookingsData.bookings ?? []);
    setTransactions(transactionsData.transactions ?? []);
    setIsLoading(false);
  }

  async function loadReport(forMonth: string) {
    setIsLoadingReport(true);
    const res = await fetch(`/api/reports/monthly?month=${forMonth}`);
    const data = await res.json();
    setReport(data);
    setIsLoadingReport(false);
  }

  useEffect(() => {
    loadDay(date);
  }, [date]);

  useEffect(() => {
    loadReport(month);
  }, [month]);

  function openPayForm(booking: Booking) {
    setPayingBookingId(booking.id);
    setPayForm({ amount: String(booking.service.price), method: "cash" });
    setPayError(null);
  }

  function closePayForm() {
    setPayingBookingId(null);
    setPayError(null);
  }

  async function handlePaySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!payingBookingId) return;
    setPayError(null);
    setIsSubmittingPay(true);

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: payingBookingId,
        amount: Number(payForm.amount),
        method: payForm.method,
      }),
    });
    const data = await res.json();

    setIsSubmittingPay(false);

    if (!res.ok) {
      setPayError(data.error ?? "Gagal mencatat pembayaran.");
      return;
    }

    setPayingBookingId(null);
    await Promise.all([loadDay(date), loadReport(month)]);
  }

  const paidTotalsByBooking = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.status !== "paid") continue;
    paidTotalsByBooking.set(
      tx.booking.id,
      (paidTotalsByBooking.get(tx.booking.id) ?? 0) + tx.amount,
    );
  }
  const dayTotal = transactions
    .filter((tx) => tx.status === "paid")
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Kasir</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Catat pembayaran booking di sini pas pelanggan bayar di tempat.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        <p className="text-sm text-neutral-500">
          Total masuk hari ini:{" "}
          <span className="font-medium text-neutral-900">
            {formatRupiah(dayTotal)}
          </span>
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Jam</th>
              <th className="px-4 py-2 font-medium">Pelanggan</th>
              <th className="px-4 py-2 font-medium">Layanan</th>
              <th className="px-4 py-2 font-medium">Harga</th>
              <th className="px-4 py-2 font-medium">Status bayar</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
                  Memuat...
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
                  Belum ada booking di tanggal ini.
                </td>
              </tr>
            ) : (
              bookings.map((booking) => {
                const paid = paidTotalsByBooking.get(booking.id) ?? 0;
                const isPaid = paid > 0;
                return (
                  <Fragment key={booking.id}>
                    <tr>
                      <td className="px-4 py-3 text-neutral-900">
                        {formatTime(booking.startTime)}
                      </td>
                      <td className="px-4 py-3 text-neutral-900">
                        {booking.customer.name}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {booking.service.name}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {formatRupiah(booking.service.price)}
                      </td>
                      <td className="px-4 py-3">
                        {isPaid ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                            Lunas · {formatRupiah(paid)}
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                            Belum bayar
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openPayForm(booking)}
                          className="text-neutral-600 underline underline-offset-4 hover:text-neutral-900"
                        >
                          {isPaid ? "Catat lagi" : "Catat pembayaran"}
                        </button>
                      </td>
                    </tr>
                    {payingBookingId === booking.id && (
                      <tr>
                        <td colSpan={6} className="bg-neutral-50 px-4 py-4">
                          <form
                            onSubmit={handlePaySubmit}
                            className="flex flex-wrap items-end gap-3"
                          >
                            <div className="w-40">
                              <label className="block text-sm font-medium text-neutral-900">
                                Jumlah (Rp)
                              </label>
                              <input
                                required
                                type="number"
                                min={0}
                                value={payForm.amount}
                                onChange={(e) =>
                                  setPayForm((f) => ({
                                    ...f,
                                    amount: e.target.value,
                                  }))
                                }
                                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                              />
                            </div>
                            <div className="w-40">
                              <label className="block text-sm font-medium text-neutral-900">
                                Metode bayar
                              </label>
                              <select
                                value={payForm.method}
                                onChange={(e) =>
                                  setPayForm((f) => ({
                                    ...f,
                                    method: e.target.value,
                                  }))
                                }
                                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                              >
                                {Object.entries(METHOD_LABEL).map(
                                  ([value, label]) => (
                                    <option key={value} value={value}>
                                      {label}
                                    </option>
                                  ),
                                )}
                              </select>
                            </div>
                            <button
                              type="submit"
                              disabled={isSubmittingPay}
                              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                            >
                              Simpan
                            </button>
                            <button
                              type="button"
                              onClick={closePayForm}
                              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                            >
                              Batal
                            </button>
                            {payError && (
                              <p className="w-full text-sm text-red-600">
                                {payError}
                              </p>
                            )}
                          </form>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* --- Laporan bulanan --- */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-neutral-900">
          Laporan pendapatan bulanan
        </h2>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
      </div>

      {isLoadingReport ? (
        <p className="mt-3 text-sm text-neutral-400">Memuat laporan...</p>
      ) : (
        <>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 p-5">
              <p className="text-sm text-neutral-500">Total pendapatan bulan ini</p>
              <p className="mt-2 text-2xl font-semibold text-neutral-900">
                {formatRupiah(report?.monthTotal ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 p-5">
              <p className="text-sm text-neutral-500">Jumlah transaksi</p>
              <p className="mt-2 text-2xl font-semibold text-neutral-900">
                {report?.monthCount ?? 0}
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-neutral-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Tanggal</th>
                  <th className="px-4 py-2 font-medium">Transaksi</th>
                  <th className="px-4 py-2 font-medium">Pendapatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!report || report.days.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-neutral-400">
                      Belum ada transaksi lunas di bulan ini.
                    </td>
                  </tr>
                ) : (
                  report.days.map((day) => (
                    <tr key={day.date}>
                      <td className="px-4 py-3 text-neutral-900">
                        {formatTanggalPendek(day.date)}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{day.count}x</td>
                      <td className="px-4 py-3 text-neutral-600">
                        {formatRupiah(day.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="mt-3 text-xs text-neutral-400">
        Laporan ini cuma ngitung transaksi yang nempel ke booking. Penjualan
        paket dicatat terpisah di menu Paket, belum ikut ke angka di atas.
      </p>
    </div>
  );
}
