"use client";

import { useEffect, useState } from "react";

type Service = { id: string; name: string; durationMin: number; price: number };
type Customer = { id: string; name: string; phone: string };

type ServiceRef = { id: string; name: string };
type PackageItem = { service: ServiceRef };

type Package = {
  id: string;
  name: string;
  totalSessions: number;
  price: number;
  items: PackageItem[];
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
    items: PackageItem[];
  };
};

type PackageForm = {
  name: string;
  serviceIds: string[];
  totalSessions: string;
  price: string;
};

const emptyPackageForm: PackageForm = {
  name: "",
  serviceIds: [],
  totalSessions: "",
  price: "",
};
const emptySellForm = { customerId: "", packageId: "", expiresAt: "" };

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

// "Potong rambut + Warnain rambut" — dipakai di tabel daftar paket & paket
// pelanggan biar paket gabungan kebaca sekilas.
function serviceNames(items: PackageItem[]) {
  return items.map((item) => item.service.name).join(" + ");
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
      serviceIds: pkg.items.map((item) => item.service.id),
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

  function toggleService(serviceId: string) {
    setPackageForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(serviceId)
        ? f.serviceIds.filter((id) => id !== serviceId)
        : [...f.serviceIds, serviceId],
    }));
  }

  async function handlePackageSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPackageError(null);

    // Checkbox group nggak bisa pakai atribut `required` bawaan browser.
    if (packageForm.serviceIds.length === 0) {
      setPackageError("Pilih minimal 1 layanan.");
      return;
    }

    setIsSubmittingPackage(true);

    const payload = {
      name: packageForm.name,
      serviceIds: packageForm.serviceIds,
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
      <h1 className="text-xl font-semibold text-ink">Paket & Membership</h1>
      <p className="mt-1 text-sm text-ink-subtle">
        Bikin paket treatment (misal &quot;5x Facial&quot;, atau gabungan
        beberapa layanan seperti &quot;Potong + Warnain&quot;), jual ke
        pelanggan, lalu pantau sisa sesinya di sini tiap kali pelanggan dateng.
      </p>

      {/* --- Daftar paket --- */}
      <h2 className="mt-8 text-sm font-semibold text-ink">Daftar paket</h2>

      <form
        onSubmit={handlePackageSubmit}
        className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-line p-4"
      >
        <div className="flex-1 min-w-[160px]">
          <label className="block text-sm font-medium text-ink">
            Nama paket
          </label>
          <input
            required
            value={packageForm.name}
            onChange={(e) =>
              setPackageForm((f) => ({ ...f, name: e.target.value }))
            }
            placeholder="Paket 5x Facial"
            className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
          />
        </div>
        <div className="w-32">
          <label className="block text-sm font-medium text-ink">
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
            className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
          />
        </div>
        <div className="w-40">
          <label className="block text-sm font-medium text-ink">
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
            className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
          />
        </div>
        <fieldset className="w-full">
          <legend className="block text-sm font-medium text-ink">
            Layanan dalam paket
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {services.map((s) => {
              const checked = packageForm.serviceIds.includes(s.id);
              return (
                <label
                  key={s.id}
                  className={`cursor-pointer select-none rounded-full border px-3 py-1.5 text-sm transition-colors focus-within:ring-2 focus-within:ring-accent/60 ${
                    checked
                      ? "border-accent bg-accent-soft font-medium text-ink"
                      : "border-line-strong text-ink-muted hover:bg-surface-2"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleService(s.id)}
                    className="sr-only"
                  />
                  {s.name}
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ink-faint">
            Pilih satu atau lebih. Satu sesi = semua layanan yang dipilih
            dikerjakan sekaligus dalam satu kunjungan.
          </p>
        </fieldset>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmittingPackage}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
          >
            {editingId ? "Simpan" : "Tambah"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-md border border-line-strong px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface-2"
            >
              Batal
            </button>
          )}
        </div>

        {services.length === 0 && (
          <p className="w-full text-sm text-warn">
            Tambahin minimal 1 layanan dulu di menu Layanan sebelum bikin paket.
          </p>
        )}
      </form>
      {packageError && <p className="mt-2 text-sm text-danger">{packageError}</p>}

      <div className="mt-4 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-ink-subtle">
            <tr>
              <th className="px-4 py-2 font-medium">Nama</th>
              <th className="px-4 py-2 font-medium">Layanan</th>
              <th className="px-4 py-2 font-medium">Sesi</th>
              <th className="px-4 py-2 font-medium">Harga</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-faint">
                  Memuat...
                </td>
              </tr>
            ) : packages.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-faint">
                  Belum ada paket. Tambahin dulu lewat form di atas.
                </td>
              </tr>
            ) : (
              packages.map((pkg) => (
                <tr key={pkg.id}>
                  <td className="px-4 py-3 text-ink">{pkg.name}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {serviceNames(pkg.items)}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{pkg.totalSessions}x</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {formatRupiah(pkg.price)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => startEdit(pkg)}
                      className="mr-3 text-ink-muted underline underline-offset-4 hover:text-ink"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handlePackageDelete(pkg.id)}
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

      {/* --- Jual paket ke pelanggan --- */}
      <h2 className="mt-10 text-sm font-semibold text-ink">
        Jual paket ke pelanggan
      </h2>

      <form
        onSubmit={handleSellSubmit}
        className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-line p-4"
      >
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-medium text-ink">
            Pelanggan
          </label>
          <select
            required
            value={sellForm.customerId}
            onChange={(e) =>
              setSellForm((f) => ({ ...f, customerId: e.target.value }))
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
            Paket
          </label>
          <select
            required
            value={sellForm.packageId}
            onChange={(e) =>
              setSellForm((f) => ({ ...f, packageId: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
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
          <label className="block text-sm font-medium text-ink">
            Kedaluwarsa (opsional)
          </label>
          <input
            type="date"
            value={sellForm.expiresAt}
            onChange={(e) =>
              setSellForm((f) => ({ ...f, expiresAt: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmittingSell}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
        >
          Jual paket
        </button>

        {customers.length === 0 || packages.length === 0 ? (
          <p className="w-full text-sm text-warn">
            Butuh minimal 1 pelanggan dan 1 paket sebelum bisa dijual.
          </p>
        ) : null}
      </form>
      {sellError && <p className="mt-2 text-sm text-danger">{sellError}</p>}
      <p className="mt-2 text-xs text-ink-faint">
        Catatan: penjualan paket belum otomatis tercatat di laporan pendapatan
        kasir — kalau pelanggan bayar tunai/QRIS/transfer buat beli paket,
        catat juga pembayarannya lewat menu Kasir biar kehitung.
      </p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-ink-subtle">
            <tr>
              <th className="px-4 py-2 font-medium">Pelanggan</th>
              <th className="px-4 py-2 font-medium">Paket</th>
              <th className="px-4 py-2 font-medium">Sisa sesi</th>
              <th className="px-4 py-2 font-medium">Dibeli</th>
              <th className="px-4 py-2 font-medium">Kedaluwarsa</th>
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
            ) : customerPackages.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-faint">
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
                    <td className="px-4 py-3 text-ink">
                      {cp.customer.name}
                      <span className="block text-xs text-ink-subtle">
                        {cp.customer.phone}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {cp.package.name}
                      <span className="block text-xs text-ink-faint">
                        {serviceNames(cp.package.items)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink">
                      <span
                        className={
                          isExpired || isFull
                            ? "text-ink-faint"
                            : "font-medium"
                        }
                      >
                        {cp.usedSessions}/{cp.package.totalSessions}
                      </span>
                      {isExpired && (
                        <span className="ml-2 rounded-full bg-danger-soft px-2 py-0.5 text-xs text-danger">
                          Kedaluwarsa
                        </span>
                      )}
                      {!isExpired && isFull && (
                        <span className="ml-2 rounded-full bg-line px-2 py-0.5 text-xs text-ink-muted">
                          Habis
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {formatTanggal(cp.purchasedAt)}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {cp.expiresAt ? formatTanggal(cp.expiresAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleSessionAction(cp.id, "use")}
                        disabled={isExpired || isFull}
                        className="mr-3 text-ink-muted underline underline-offset-4 hover:text-ink disabled:cursor-not-allowed disabled:text-ink-faint disabled:no-underline"
                      >
                        Pakai sesi
                      </button>
                      <button
                        onClick={() => handleSessionAction(cp.id, "undo")}
                        disabled={cp.usedSessions === 0}
                        className="mr-3 text-ink-subtle underline underline-offset-4 hover:text-ink disabled:cursor-not-allowed disabled:text-ink-faint disabled:no-underline"
                      >
                        Batal pakai
                      </button>
                      <button
                        onClick={() => handleCustomerPackageDelete(cp.id)}
                        className="text-danger underline underline-offset-4 hover:text-danger"
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
