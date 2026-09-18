"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createCustomer, deleteCustomer, updateCustomer } from "./actions";

type CustomerItem = {
  id: string;
  name: string;
  phone: string;
  notes: string | null;
};

const inputClass =
  "mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none";

export function CustomersManager({
  outletSlug,
  initialCustomers,
}: {
  outletSlug: string;
  initialCustomers: CustomerItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setFormError(null);
    startTransition(async () => {
      const result = await createCustomer(outletSlug, formData);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      (
        document.getElementById("create-customer-form") as HTMLFormElement | null
      )?.reset();
      router.refresh();
    });
  }

  function handleUpdate(customerId: string, formData: FormData) {
    setFormError(null);
    startTransition(async () => {
      const result = await updateCustomer(outletSlug, customerId, formData);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setEditingId(null);
      router.refresh();
    });
  }

  function handleDelete(customerId: string) {
    if (!confirm("Hapus pelanggan ini?")) return;
    setFormError(null);
    setDeletingId(customerId);
    startTransition(async () => {
      const result = await deleteCustomer(outletSlug, customerId);
      setDeletingId(null);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-6 space-y-6">
      <form
        id="create-customer-form"
        action={handleCreate}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-line p-4"
      >
        <div className="min-w-[160px] flex-1">
          <label htmlFor="name" className="block text-sm font-medium text-ink">
            Nama
          </label>
          <input id="name" name="name" required className={inputClass} />
        </div>
        <div className="w-44">
          <label htmlFor="phone" className="block text-sm font-medium text-ink">
            No. HP
          </label>
          <input id="phone" name="phone" required placeholder="62812xxxxxxx" className={inputClass} />
        </div>
        <div className="min-w-[200px] flex-1">
          <label htmlFor="notes" className="block text-sm font-medium text-ink">
            Catatan (opsional)
          </label>
          <input id="notes" name="notes" placeholder="Alergi, preferensi, dll" className={inputClass} />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
        >
          Tambah
        </button>
      </form>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-2 text-ink-subtle">
            <tr>
              <th className="px-4 py-2 font-medium">Nama</th>
              <th className="px-4 py-2 font-medium">No. HP</th>
              <th className="px-4 py-2 font-medium">Catatan</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {initialCustomers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-subtle">
                  Belum ada pelanggan.
                </td>
              </tr>
            )}
            {initialCustomers.map((customer) =>
              editingId === customer.id ? (
                <tr key={customer.id}>
                  <td colSpan={4} className="px-4 py-3">
                    <form
                      action={(formData) => handleUpdate(customer.id, formData)}
                      className="flex flex-wrap items-end gap-3"
                    >
                      <input
                        name="name"
                        defaultValue={customer.name}
                        required
                        className="min-w-[140px] flex-1 rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
                      />
                      <input
                        name="phone"
                        defaultValue={customer.phone}
                        required
                        className="w-40 rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
                      />
                      <input
                        name="notes"
                        defaultValue={customer.notes ?? ""}
                        className="min-w-[180px] flex-1 rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isPending}
                        className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
                      >
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-md border border-line-strong px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface-2"
                      >
                        Batal
                      </button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={customer.id}>
                  <td className="px-4 py-3 text-ink">{customer.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{customer.phone}</td>
                  <td className="px-4 py-3 text-ink-muted">{customer.notes ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditingId(customer.id)}
                      className="mr-3 text-sm font-medium text-ink-muted hover:underline"
                    >
                      Ubah
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      disabled={deletingId === customer.id}
                      className="text-sm font-medium text-danger hover:underline disabled:opacity-50"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
