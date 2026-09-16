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
      <h1 className="text-xl font-semibold text-neutral-900">Pelanggan</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Data pelanggan, plus catatan alergi/preferensi kalau ada.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 p-4"
      >
        <div className="flex-1 min-w-[160px]">
          <label className="block text-sm font-medium text-neutral-900">
            Nama
          </label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div className="w-44">
          <label className="block text-sm font-medium text-neutral-900">
            No. HP
          </label>
          <input
            required
            placeholder="62812xxxxxxx"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-neutral-900">
            Catatan (opsional)
          </label>
          <input
            placeholder="Alergi, preferensi, dll"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
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
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nama</th>
              <th className="px-4 py-2 font-medium">No. HP</th>
              <th className="px-4 py-2 font-medium">Catatan</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-400">
                  Memuat...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-400">
                  Belum ada pelanggan. Tambahin dulu lewat form di atas.
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-4 py-3 text-neutral-900">{customer.name}</td>
                  <td className="px-4 py-3 text-neutral-600">{customer.phone}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {customer.notes ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => startEdit(customer)}
                      className="mr-3 text-neutral-600 underline underline-offset-4 hover:text-neutral-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
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
    </div>
  );
}
