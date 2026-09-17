"use client";

import { useEffect, useState } from "react";

type Service = { id: string; name: string; durationMin: number; price: number };
type Customer = { id: string; name: string; phone: string };

type Package = {
  id: string;
  name: string;
  totalSessions: number;
  price: number;
  service: { id: string; name: string };
};

type CustomerPackage = {
  id: string;
  usedSessions: number;
  purchasedAt: string;
  expiresAt: string | null;
  customer: { id: string; name: string; phone: string };
  package: {
    id: string;
    name: string;
    totalSessions: number;
    price: number;
    service: { id: string; name: string };
  };
};

const emptyPackageForm = { name: "", serviceId: "", totalSessions: "", price: "" };
const emptySellForm = { customerId: "", packageId: "", expiresAt: "" };

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerPackages, setCustomerPackages] = useState<CustomerPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [packageForm, setPackageForm] = useState(emptyPackageForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [packageError, setPackageError] = useState<string | null>(null);
  const [isSubmittingPackage, setIsSubmittingPackage] = useState(false);

  const [sellForm, setSellForm] = useState(emptySellForm);
  const [sellError, setSellError] = useState<string | null>(null);
  const [isSubmittingSell, setIsSubmittingSell] = useState(false);

  async function loadAll() {
    setIsLoading(true);
    const [packagesRes, servicesRes, customersRes, customerPackagesRes] =
      await Promise.all([
        fetch("/api/packages"),
        fetch("/api/services"),
        fetch("/api/customers"),
        fetch("/api/customer-packages"),
      ]);
    const [packagesData, servicesData, customersData, customerPackagesData] =
      await Promise.all([
        packagesRes.json(),
        servicesRes.json(),
        customersRes.json(),
        customerPackagesRes.json(),
      ]);
    setPackages(packagesData.packages ?? []);
    setServices(servicesData.services ?? []);
    setCustomers(customersData.customers ?? []);
    setCustomerPackages(customerPackagesData.customerPackages ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function startEdit(pkg: Package) {
    setEditingId(pkg.id);
    setPackageForm({
      name: pkg.name,
      serviceId: pkg.service.id,
      totalSessions: String(pkg.totalSessions),
      price: String(pkg.price),
    });
    setPackageError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setPackageForm(emptyPackageForm);
    setPackageError(null);
  }

  async function handlePackageSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPackageError(null);
    setIsSubmittingPackage(true);

    const payload = {
      name: packageForm.name,
      serviceId: packageForm.serviceId,
      totalSessions: Number(packageForm.totalSessions),
      price: Number(packageForm.price),
    };

    const res = await fetch(
      editingId ? `/api/packages/${editingId}` : "/api/packages",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json();

    setIsSubmittingPackage(false);

    if (!res.ok) {
      setPackageError(data.error ?? "Gagal menyimpan paket.");
      return;
    }

    setPackageForm(emptyPackageForm);
    setEditingId(null);
    await loadAll();
  }

  async function handlePackageDelete(id: string) {
    if (!confirm("Hapus paket ini?")) return;
    const res = await fetch(`/api/packages/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadAll();
    } else {
      const data = await res.json();
      alert(data.error ?? "Gagal menghapus paket.");
    }
  }

  async function handleSellSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSellError(null);

    if (!sellForm.customerId || !sellForm.packageId) {
      setSellError("Pelanggan dan paket wajib dipilih.");
      return;
    }

    setIsSubmittingSell(true);

    const res = await fetch("/api/customer-packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: sellForm.customerId,
        packageId: sellForm.packageId,
        expiresAt: sellForm.expiresAt || null,
      }),
    });
    const data = await res.json();

    setIsSubmittingSell(false);

    if (!res.ok) {
      setSellError(data.error ?? "Gagal jual paket.");
      return;
    }

    setSellForm(emptySellForm);
    await loadAll();
  }

  async function handleSessionAction(id: string, action: "use" | "undo") {
    const res = await fetch(`/api/customer-packages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      await loadAll();
    } else {
      const data = await res.json();
      alert(data.error ?? "Gagal update sesi.");
    }
  }

  async function handleCustomerPackageDelete(id: string) {
    if (!confirm("Batalin paket pelanggan ini? Ini buat koreksi kalau salah input.")) {
      return;
    }
    const res = await fetch(`/api/customer-packages/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadAll();
    } else {
      const data = await res.json();
      alert(data.error ?? "Gagal menghapus.");
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Paket & Membership</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Bikin paket treatment (misal &quot;5x Facial&quot;), jual ke pelanggan,
        lalu pantau sisa sesinya di sini tiap kali pelanggan dateng.
      </p>

      {/* --- Daftar paket --- */}
      <h2 className="mt-8 text-sm font-semibold text-neutral-900">Daftar paket</h2>

      <form
        onSubmit={handlePackageSubmit}
        className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 p-4"
      >
        <div className="flex-1 min-w-[160px]">
          <label className="block text-sm font-medium text-neutral-900">
            Nama paket
          </label>
          <input
            required
            value={packageForm.name}
            onChange={(e) =>
              setPackageForm((f) => ({ ...f, name: e.target.value }))
            }
            placeholder="Paket 5x Facial"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div className="min-w-[160px]">
          <label className="block text-sm font-medium text-neutral-900">
            Layanan
          </label>
          <select
            required
            value={packageForm.serviceId}
            onChange={(e) =>
              setPackageForm((f) => ({ ...f, serviceId: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          >
            <option value="">Pilih layanan</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label className="block text-sm font-medium text-neutral-900">
            Jumlah sesi
          </label>
          <input
            required
            type="number"
            min={1}
            value={packageForm.totalSessions}
            onChange={(e) =>
              setPackageForm((f) => ({ ...f, totalSessions: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div className="w-40">
          <label className="block text-sm font-medium text-neutral-900">
            Harga paket (Rp)
          </label>
          <input
            required
            type="number"
            min={0}
            value={packageForm.price}
            onChange={(e) =>
              setPackageForm((f) => ({ ...f, price: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmittingPackage}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {editingId ? "Simpan" : "Tambah"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Batal
            </button>
          )}
        </div>

        {services.length === 0 && (
          <p className="w-full text-sm text-amber-700">
            Tambahin minimal 1 layanan dulu di menu Layanan sebelum bikin paket.
          </p>
        )}
      </form>
      {packageError && <p className="mt-2 text-sm text-red-600">{packageError}</p>}

      <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nama</th>
              <th className="px-4 py-2 font-medium">Layanan</th>
              <th className="px-4 py-2 font-medium">Sesi</th>
              <th className="px-4 py-2 font-medium">Harga</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">
                  Memuat...
                </td>
              </tr>
            ) : packages.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">
                  Belum ada paket. Tambahin dulu lewat form di atas.
                </td>
              </tr>
            ) : (
              packages.map((pkg) => (
                <tr key={pkg.id}>
                  <td className="px-4 py-3 text-neutral-900">{pkg.name}</td>
                  <td className="px-4 py-3 text-neutral-600">{pkg.service.name}</td>
                  <td className="px-4 py-3 text-neutral-600">{pkg.totalSessions}x</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {formatRupiah(pkg.price)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => startEdit(pkg)}
                      className="mr-3 text-neutral-600 underline underline-offset-4 hover:text-neutral-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handlePackageDelete(pkg.id)}
                      className="text-red-600 underline underline-offset-4 hover:text-red-800"
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

      {/* --- Jual paket ke pelanggan --- */}
      <h2 className="mt-10 text-sm font-semibold text-neutral-900">
        Jual paket ke pelanggan
      </h2>

      <form
        onSubmit={handleSellSubmit}
        className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 p-4"
      >
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-medium text-neutral-900">
            Pelanggan
          </label>
          <select
            required
            value={sellForm.customerId}
            onChange={(e) =>
              setSellForm((f) => ({ ...f, customerId: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
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
          <label className="block text-sm font-medium text-neutral-900">
            Paket
          </label>
          <select
            required
            value={sellForm.packageId}
            onChange={(e) =>
              setSellForm((f) => ({ ...f, packageId: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          >
            <option value="">Pilih paket</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.totalSessions}x — {formatRupiah(p.price)})
              </option>
            ))}
          </select>
        </div>
        <div className="w-44">
          <label className="block text-sm font-medium text-neutral-900">
            Kedaluwarsa (opsional)
          </label>
          <input
            type="date"
            value={sellForm.expiresAt}
            onChange={(e) =>
              setSellForm((f) => ({ ...f, expiresAt: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmittingSell}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          Jual paket
        </button>

        {customers.length === 0 || packages.length === 0 ? (
          <p className="w-full text-sm text-amber-700">
            Butuh minimal 1 pelanggan dan 1 paket sebelum bisa dijual.
          </p>
        ) : null}
      </form>
      {sellError && <p className="mt-2 text-sm text-red-600">{sellError}</p>}
      <p className="mt-2 text-xs text-neutral-400">
        Catatan: penjualan paket belum otomatis tercatat di laporan pendapatan
        kasir — kalau pelanggan bayar tunai/QRIS/transfer buat beli paket,
        catat juga pembayarannya lewat menu Kasir biar kehitung.
      </p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Pelanggan</th>
              <th className="px-4 py-2 font-medium">Paket</th>
              <th className="px-4 py-2 font-medium">Sisa sesi</th>
              <th className="px-4 py-2 font-medium">Dibeli</th>
              <th className="px-4 py-2 font-medium">Kedaluwarsa</th>
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
            ) : customerPackages.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
                  Belum ada paket yang terjual.
                </td>
              </tr>
            ) : (
              customerPackages.map((cp) => {
                const isExpired = cp.expiresAt
                  ? new Date(cp.expiresAt) < new Date()
                  : false;
                const isFull = cp.usedSessions >= cp.package.totalSessions;
                return (
                  <tr key={cp.id}>
                    <td className="px-4 py-3 text-neutral-900">
                      {cp.customer.name}
                      <span className="block text-xs text-neutral-500">
                        {cp.customer.phone}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {cp.package.name}
                      <span className="block text-xs text-neutral-400">
                        {cp.package.service.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-900">
                      <span
                        className={
                          isExpired || isFull
                            ? "text-neutral-400"
                            : "font-medium"
                        }
                      >
                        {cp.usedSessions}/{cp.package.totalSessions}
                      </span>
                      {isExpired && (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                          Kedaluwarsa
                        </span>
                      )}
                      {!isExpired && isFull && (
                        <span className="ml-2 rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
                          Habis
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {formatTanggal(cp.purchasedAt)}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {cp.expiresAt ? formatTanggal(cp.expiresAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleSessionAction(cp.id, "use")}
                        disabled={isExpired || isFull}
                        className="mr-3 text-neutral-600 underline underline-offset-4 hover:text-neutral-900 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:no-underline"
                      >
                        Pakai sesi
                      </button>
                      <button
                        onClick={() => handleSessionAction(cp.id, "undo")}
                        disabled={cp.usedSessions === 0}
                        className="mr-3 text-neutral-500 underline underline-offset-4 hover:text-neutral-900 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:no-underline"
                      >
                        Batal pakai
                      </button>
                      <button
                        onClick={() => handleCustomerPackageDelete(cp.id)}
                        className="text-red-600 underline underline-offset-4 hover:text-red-800"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
