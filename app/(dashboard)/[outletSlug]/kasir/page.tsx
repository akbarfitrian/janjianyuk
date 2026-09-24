"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";

type Booking = {
  id: string;
  startTime: string;
  status: string;
  customer: { id: string; name: string };
  service: { id: string; name: string; price: number };
  // Ada isinya kalau booking ini "lunas" karena dibayar pakai sesi paket,
  // bukan tunai/QRIS/transfer.
  packageSessionUsage: {
    id: string;
    customerPackage: { id: string; package: { name: string } };
  } | null;
};

// Buat nyaring "paket aktif pelanggan ini yang nyakup layanan booking ini"
// pas staff mau catat pembayaran di Kasir.
type CustomerPackageOption = {
  id: string;
  usedSessions: number;
  expiresAt: string | null;
  customer: { id: string };
  package: {
    id: string;
    name: string;
    totalSessions: number;
    items: { service: { id: string } }[];
  };
};

type Transaction = {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  // Persis salah satu dari dua ini yang keisi: booking (bayar per
  // kunjungan) atau customerPackage (bayar paket di muka).
  booking: { id: string; customer: { name: string }; service: { name: string } } | null;
  customerPackage: {
    id: string;
    customer: { name: string };
    package: { name: string };
  } | null;
};

type MonthlyReport = {
  month: string;
  monthTotal: number;
  monthCount: number;
  bookingTotal: number;
  packageTotal: number;
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

function DownloadIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  );
}

function ChevronDownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function monthLabelOf(month: string) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

// Susun laporan bulanan jadi CSV terus trigger download-nya lewat blob URL.
function downloadMonthlyReportCsv(month: string, report: MonthlyReport) {
  const rows = [
    "Laporan Pendapatan Bulanan",
    `Bulan,${monthLabelOf(month)}`,
    `Total Pendapatan,${report.monthTotal}`,
    `Jumlah Transaksi,${report.monthCount}`,
    `Dari Booking,${report.bookingTotal}`,
    `Dari Penjualan Paket,${report.packageTotal}`,
    "",
    "Tanggal,Jumlah Transaksi,Pendapatan",
    ...report.days.map((day) => `${day.date},${day.count},${day.total}`),
  ];

  // BOM di depan biar Excel baca sebagai UTF-8, bukan salah nebak encoding.
  const blob = new Blob(["\ufeff" + rows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `laporan-pendapatan-${month}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Susun laporan bulanan jadi PDF simpel (judul, ringkasan, tabel per tanggal).
function downloadMonthlyReportPdf(month: string, report: MonthlyReport) {
  const printedLabel = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const doc = new jsPDF();
  const marginX = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const col = { tanggal: marginX, transaksi: marginX + 75, pendapatan: marginX + 115 };
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Laporan Pendapatan Bulanan", marginX, y);

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Bulan: ${monthLabelOf(month)}`, marginX, y);
  y += 5;
  doc.text(`Dicetak: ${printedLabel}`, marginX, y);

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Total Pendapatan: ${formatRupiah(report.monthTotal)}`, marginX, y);
  y += 6;
  doc.text(`Jumlah Transaksi: ${report.monthCount}`, marginX, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Dari booking: ${formatRupiah(report.bookingTotal)}   ·   Dari penjualan paket: ${formatRupiah(report.packageTotal)}`,
    marginX,
    y,
  );

  y += 8;
  doc.setDrawColor(200);
  doc.line(marginX, y, pageWidth - marginX, y);

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Tanggal", col.tanggal, y);
  doc.text("Transaksi", col.transaksi, y);
  doc.text("Pendapatan", col.pendapatan, y);
  y += 3;
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  if (report.days.length === 0) {
    doc.text("Belum ada transaksi lunas di bulan ini.", marginX, y);
    y += 6;
  } else {
    for (const day of report.days) {
      if (y > pageHeight - 25) {
        doc.addPage();
        y = 20;
      }
      doc.text(formatTanggalPendek(day.date), col.tanggal, y);
      doc.text(`${day.count}x`, col.transaksi, y);
      doc.text(formatRupiah(day.total), col.pendapatan, y);
      y += 6;
    }
  }

  if (y > pageHeight - 20) {
    doc.addPage();
    y = 20;
  }
  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(120);
  const footnote = doc.splitTextToSize(
    "Laporan ini gabungan pembayaran booking (dicatat di Kasir) dan penjualan paket (dicatat di menu Paket).",
    pageWidth - marginX * 2,
  );
  doc.text(footnote, marginX, y);

  doc.save(`laporan-pendapatan-${month}.pdf`);
}

function ReportDownloadMenu({
  month,
  report,
}: {
  month: string;
  report: MonthlyReport | null;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tutup dropdown kalau klik di luar area menu.
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!report}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md border border-line-strong px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <DownloadIcon className="h-4 w-4" />
        Download
        <ChevronDownIcon className="h-3.5 w-3.5 text-ink-faint" />
      </button>

      {open && report && (
        <div className="absolute right-0 z-10 mt-2 w-44 rounded-lg border border-line bg-surface p-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              downloadMonthlyReportCsv(month, report);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink-muted hover:bg-surface-2"
          >
            Download CSV
          </button>
          <button
            type="button"
            onClick={() => {
              downloadMonthlyReportPdf(month, report);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink-muted hover:bg-surface-2"
          >
            Download PDF
          </button>
        </div>
      )}
    </div>
  );
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

  // Nggak date-scoped kayak bookings/transactions — paket pelanggan tetap
  // "aktif" lepas dari tanggal yang lagi dilihat di Kasir.
  const [customerPackages, setCustomerPackages] = useState<CustomerPackageOption[]>([]);
  const [packagePayBusyId, setPackagePayBusyId] = useState<string | null>(null);
  const [packagePayError, setPackagePayError] = useState<string | null>(null);

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

  async function loadCustomerPackages() {
    const res = await fetch("/api/customer-packages");
    const data = await res.json();
    setCustomerPackages(data.customerPackages ?? []);
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
    loadCustomerPackages();
  }, []);

  useEffect(() => {
    loadReport(month);
  }, [month]);

  // Paket aktif milik pelanggan ini, yang nyakup layanan di booking ini,
  // dan sisa sesinya masih ada. Ini yang nentuin apa opsi "bayar pakai
  // paket" muncul pas staff buka form catat pembayaran.
  function eligiblePackagesFor(booking: Booking) {
    const now = Date.now();
    return customerPackages.filter((cp) => {
      if (cp.customer.id !== booking.customer.id) return false;
      if (cp.expiresAt && new Date(cp.expiresAt).getTime() < now) return false;
      if (cp.usedSessions >= cp.package.totalSessions) return false;
      return cp.package.items.some((item) => item.service.id === booking.service.id);
    });
  }

  function openPayForm(booking: Booking) {
    setPayingBookingId(booking.id);
    setPayForm({ amount: String(booking.service.price), method: "cash" });
    setPayError(null);
    setPackagePayError(null);
  }

  function closePayForm() {
    setPayingBookingId(null);
    setPayError(null);
    setPackagePayError(null);
  }

  async function handleUsePackageSession(bookingId: string, customerPackageId: string) {
    setPackagePayBusyId(customerPackageId);
    setPackagePayError(null);

    const res = await fetch(`/api/bookings/${bookingId}/use-package-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerPackageId }),
    });
    const data = await res.json();

    setPackagePayBusyId(null);

    if (!res.ok) {
      setPackagePayError(data.error ?? "Gagal pakai sesi paket.");
      return;
    }

    setPayingBookingId(null);
    await Promise.all([loadDay(date), loadCustomerPackages(), loadReport(month)]);
  }

  async function handleUndoPackageSession(bookingId: string) {
    setPackagePayBusyId(bookingId);
    const res = await fetch(`/api/bookings/${bookingId}/use-package-session`, {
      method: "DELETE",
    });
    const data = await res.json();
    setPackagePayBusyId(null);

    if (!res.ok) {
      window.alert(data.error ?? "Gagal batalin pemakaian sesi paket.");
      return;
    }

    await Promise.all([loadDay(date), loadCustomerPackages(), loadReport(month)]);
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
    if (tx.status !== "paid" || !tx.booking) continue;
    paidTotalsByBooking.set(
      tx.booking.id,
      (paidTotalsByBooking.get(tx.booking.id) ?? 0) + tx.amount,
    );
  }
  // dayTotal sengaja ngitung SEMUA transaksi lunas di tanggal ini, baik dari
  // pembayaran booking maupun dari penjualan paket — bukan cuma yang
  // nempel ke booking yang tampil di tabel bawah.
  const dayTotal = transactions
    .filter((tx) => tx.status === "paid")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const packageSalesToday = transactions.filter(
    (tx) => tx.status === "paid" && tx.customerPackage,
  );

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Kasir</h1>
      <p className="mt-1 text-sm text-ink-subtle">
        Catat pembayaran booking di sini pas pelanggan bayar di tempat — atau
        pakai sesi paket kalau pelanggan udah beli paket duluan.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
        />
        <p className="text-sm text-ink-subtle">
          Total masuk hari ini:{" "}
          <span className="font-medium text-ink">
            {formatRupiah(dayTotal)}
          </span>
        </p>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-ink-subtle">
            <tr>
              <th className="px-4 py-2 font-medium">Jam</th>
              <th className="px-4 py-2 font-medium">Pelanggan</th>
              <th className="px-4 py-2 font-medium">Layanan</th>
              <th className="px-4 py-2 font-medium">Harga</th>
              <th className="px-4 py-2 font-medium">Status bayar</th>
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
              bookings.map((booking) => {
                const paid = paidTotalsByBooking.get(booking.id) ?? 0;
                const paidViaPackage = booking.packageSessionUsage;
                const isPaid = paid > 0 || !!paidViaPackage;
                const eligiblePackages = eligiblePackagesFor(booking);
                return (
                  <Fragment key={booking.id}>
                    <tr>
                      <td className="px-4 py-3 text-ink">
                        {formatTime(booking.startTime)}
                      </td>
                      <td className="px-4 py-3 text-ink">
                        {booking.customer.name}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">
                        {booking.service.name}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">
                        {formatRupiah(booking.service.price)}
                      </td>
                      <td className="px-4 py-3">
                        {paidViaPackage ? (
                          <span className="rounded-full bg-ok-soft px-2 py-1 text-xs font-medium text-ok">
                            Lunas (paket) · {paidViaPackage.customerPackage.package.name}
                          </span>
                        ) : isPaid ? (
                          <span className="rounded-full bg-ok-soft px-2 py-1 text-xs font-medium text-ok">
                            Lunas · {formatRupiah(paid)}
                          </span>
                        ) : (
                          <span className="rounded-full bg-warn-soft px-2 py-1 text-xs font-medium text-warn">
                            Belum bayar
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {paidViaPackage ? (
                          <button
                            onClick={() => handleUndoPackageSession(booking.id)}
                            disabled={packagePayBusyId === booking.id}
                            className="text-ink-muted underline underline-offset-4 hover:text-ink disabled:opacity-50"
                          >
                            Batal (paket)
                          </button>
                        ) : (
                          <button
                            onClick={() => openPayForm(booking)}
                            className="text-ink-muted underline underline-offset-4 hover:text-ink"
                          >
                            {isPaid ? "Catat lagi" : "Catat pembayaran"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {payingBookingId === booking.id && (
                      <tr>
                        <td colSpan={6} className="bg-surface-2 px-4 py-4">
                          {eligiblePackages.length > 0 && (
                            <div className="mb-4 rounded-md border border-line-strong bg-surface p-3">
                              <p className="text-sm font-medium text-ink">
                                {booking.customer.name} punya paket aktif buat layanan ini:
                              </p>
                              <ul className="mt-2 space-y-2">
                                {eligiblePackages.map((cp) => {
                                  const sisa = cp.package.totalSessions - cp.usedSessions;
                                  return (
                                    <li
                                      key={cp.id}
                                      className="flex flex-wrap items-center justify-between gap-2"
                                    >
                                      <span className="text-sm text-ink-muted">
                                        {cp.package.name} — sisa {sisa} sesi
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleUsePackageSession(booking.id, cp.id)}
                                        disabled={packagePayBusyId === cp.id}
                                        className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
                                      >
                                        {packagePayBusyId === cp.id ? "Memproses..." : "Pakai sesi ini"}
                                      </button>
                                    </li>
                                  );
                                })}
                              </ul>
                              {packagePayError && (
                                <p className="mt-2 text-sm text-danger">{packagePayError}</p>
                              )}
                              <p className="mt-2 text-xs text-ink-faint">
                                Nggak nyatet pembayaran baru — cuma nandain sesi paket ini kepakai buat kunjungan ini.
                              </p>
                            </div>
                          )}
                          {eligiblePackages.length > 0 && (
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
                              Atau catat pembayaran manual
                            </p>
                          )}
                          <form
                            onSubmit={handlePaySubmit}
                            className="flex flex-wrap items-end gap-3"
                          >
                            <div className="w-40">
                              <label className="block text-sm font-medium text-ink">
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
                                className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
                              />
                            </div>
                            <div className="w-40">
                              <label className="block text-sm font-medium text-ink">
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
                                className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
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
                              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
                            >
                              Simpan
                            </button>
                            <button
                              type="button"
                              onClick={closePayForm}
                              className="rounded-md border border-line-strong px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface-2"
                            >
                              Batal
                            </button>
                            {payError && (
                              <p className="w-full text-sm text-danger">
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

      {/* --- Penjualan paket hari ini --- */}
      {packageSalesToday.length > 0 && (
        <>
          <h2 className="mt-10 text-sm font-semibold text-ink">
            Penjualan paket hari ini
          </h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-left text-ink-subtle">
                <tr>
                  <th className="px-4 py-2 font-medium">Jam</th>
                  <th className="px-4 py-2 font-medium">Pelanggan</th>
                  <th className="px-4 py-2 font-medium">Paket</th>
                  <th className="px-4 py-2 font-medium">Metode</th>
                  <th className="px-4 py-2 font-medium">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {packageSalesToday.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-4 py-3 text-ink">{formatTime(tx.createdAt)}</td>
                    <td className="px-4 py-3 text-ink">
                      {tx.customerPackage?.customer.name}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {tx.customerPackage?.package.name}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {METHOD_LABEL[tx.method] ?? tx.method}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {formatRupiah(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink-faint">
            Sudah ikut kehitung di &quot;Total masuk hari ini&quot; di atas dan di laporan bulanan di bawah.
          </p>
        </>
      )}

      {/* --- Laporan bulanan --- */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">
          Laporan pendapatan bulanan
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
          />
          <ReportDownloadMenu month={month} report={report} />
        </div>
      </div>

      {isLoadingReport ? (
        <p className="mt-3 text-sm text-ink-faint">Memuat laporan...</p>
      ) : (
        <>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-line p-5">
              <p className="text-sm text-ink-subtle">Total pendapatan bulan ini</p>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {formatRupiah(report?.monthTotal ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border border-line p-5">
              <p className="text-sm text-ink-subtle">Jumlah transaksi</p>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {report?.monthCount ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-line p-5">
              <p className="text-sm text-ink-subtle">Dari booking</p>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {formatRupiah(report?.bookingTotal ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border border-line p-5">
              <p className="text-sm text-ink-subtle">Dari penjualan paket</p>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {formatRupiah(report?.packageTotal ?? 0)}
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-left text-ink-subtle">
                <tr>
                  <th className="px-4 py-2 font-medium">Tanggal</th>
                  <th className="px-4 py-2 font-medium">Transaksi</th>
                  <th className="px-4 py-2 font-medium">Pendapatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {!report || report.days.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-ink-faint">
                      Belum ada transaksi lunas di bulan ini.
                    </td>
                  </tr>
                ) : (
                  report.days.map((day) => (
                    <tr key={day.date}>
                      <td className="px-4 py-3 text-ink">
                        {formatTanggalPendek(day.date)}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{day.count}x</td>
                      <td className="px-4 py-3 text-ink-muted">
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

      <p className="mt-3 text-xs text-ink-faint">
        Laporan ini gabungan pembayaran booking (dicatat di Kasir) dan
        penjualan paket (dicatat di menu Paket) — keduanya otomatis kehitung
        begitu tercatat lunas.
      </p>
    </div>
  );
}
