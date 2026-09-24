"use client";

import { useEffect, useState } from "react";

type Customer = {
  id: string;
  name: string;
  phone: string;
  notes: string | null;
};

const emptyForm = { name: "", phone: "", notes: "" };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadCustomers() {
    setIsLoading(true);
    const res = await fetch("/api/customers");
    const data = await res.json();
    setCustomers(data.customers ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  function startEdit(customer: Customer) {
    setEditingId(customer.id);
    setForm({
      name: customer.name,
      phone: customer.phone,
      notes: customer.notes ?? "",
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

    const res = await fetch(
      editingId ? `/api/customers/${editingId}` : "/api/customers",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      },
    );
    const data = await res.json();

    setIsSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal menyimpan pelanggan.");
      return;
    }

    setForm(emptyForm);
    setEditingId(null);
    await loadCustomers();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus pelanggan ini?")) return;
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadCustomers();
    } else {
      const data = await res.json();
      alert(data.error ?? "Gagal menghapus pelanggan.");
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Pelanggan</h1>
      <p className="mt-1 text-sm text-ink-subtle">
        Data pelanggan, plus catatan alergi/preferensi kalau ada.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-line p-4"
      >
        <div className="flex-1 min-w-[160px]">
          <label className="block text-sm font-medium text-ink">
            Nama
          </label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
          />
        </div>
        <div className="w-44">
          <label className="block text-sm font-medium text-ink">
            No. HP
          </label>
          <input
            required
            placeholder="0812xxxxxxxx"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-ink">
            Catatan (opsional)
          </label>
          <input
            placeholder="Alergi, preferensi, dll"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
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
      <p className="mt-2 text-xs text-ink-faint">
        No. HP boleh ditulis 08…, +62…, atau 62… — otomatis disimpan sebagai
        62… (format WhatsApp). Satu no. HP cuma bisa dipakai satu pelanggan.
      </p>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-ink-subtle">
            <tr>
              <th className="px-4 py-2 font-medium">Nama</th>
              <th className="px-4 py-2 font-medium">No. HP</th>
              <th className="px-4 py-2 font-medium">Catatan</th>
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
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-faint">
                  Belum ada pelanggan. Tambahin dulu lewat form di atas.
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-4 py-3 text-ink">{customer.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{customer.phone}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {customer.notes ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => startEdit(customer)}
                      className="mr-3 text-ink-muted underline underline-offset-4 hover:text-ink"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
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
