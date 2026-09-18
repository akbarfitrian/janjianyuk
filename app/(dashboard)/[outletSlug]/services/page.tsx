"use client";

import { useEffect, useState } from "react";

type Service = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
};

const emptyForm = { name: "", durationMin: "", price: "" };

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadServices() {
    setIsLoading(true);
    const res = await fetch("/api/services");
    const data = await res.json();
    setServices(data.services ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadServices();
  }, []);

  function startEdit(service: Service) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      durationMin: String(service.durationMin),
      price: String(service.price),
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const payload = {
      name: form.name,
      durationMin: Number(form.durationMin),
      price: Number(form.price),
    };

    const res = await fetch(
      editingId ? `/api/services/${editingId}` : "/api/services",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json();

    setIsSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal menyimpan layanan.");
      return;
    }

    setForm(emptyForm);
    setEditingId(null);
    await loadServices();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus layanan ini?")) return;
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadServices();
    } else {
      const data = await res.json();
      alert(data.error ?? "Gagal menghapus layanan.");
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Layanan</h1>
      <p className="mt-1 text-sm text-ink-subtle">
        Daftar layanan yang ditawarkan outlet kamu — jadi dasar buat booking
        dan halaman booking publik nanti.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-line p-4"
      >
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-medium text-ink">
            Nama layanan
          </label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Facial Basic"
            className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
          />
        </div>
        <div className="w-32">
          <label className="block text-sm font-medium text-ink">
            Durasi (menit)
          </label>
          <input
            required
            type="number"
            min={1}
            value={form.durationMin}
            onChange={(e) =>
              setForm((f) => ({ ...f, durationMin: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
          />
        </div>
        <div className="w-40">
          <label className="block text-sm font-medium text-ink">
            Harga (Rp)
          </label>
          <input
            required
            type="number"
            min={0}
            value={form.price}
            onChange={(e) =>
              setForm((f) => ({ ...f, price: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
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
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-ink-subtle">
            <tr>
              <th className="px-4 py-2 font-medium">Nama</th>
              <th className="px-4 py-2 font-medium">Durasi</th>
              <th className="px-4 py-2 font-medium">Harga</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-faint">
                  Memuat...
                </td>
              </tr>
            ) : services.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-faint">
                  Belum ada layanan. Tambahin dulu lewat form di atas.
                </td>
              </tr>
            ) : (
              services.map((service) => (
                <tr key={service.id}>
                  <td className="px-4 py-3 text-ink">{service.name}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {service.durationMin} menit
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {formatRupiah(service.price)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => startEdit(service)}
                      className="mr-3 text-ink-muted underline underline-offset-4 hover:text-ink"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
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
