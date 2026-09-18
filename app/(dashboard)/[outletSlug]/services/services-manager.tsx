"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createService, deleteService, updateService } from "./actions";

type ServiceItem = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const inputClass =
  "mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none";

export function ServicesManager({
  outletSlug,
  initialServices,
}: {
  outletSlug: string;
  initialServices: ServiceItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setFormError(null);
    startTransition(async () => {
      const result = await createService(outletSlug, formData);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      (
        document.getElementById("create-service-form") as HTMLFormElement | null
      )?.reset();
      router.refresh();
    });
  }

  function handleUpdate(serviceId: string, formData: FormData) {
    setFormError(null);
    startTransition(async () => {
      const result = await updateService(outletSlug, serviceId, formData);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setEditingId(null);
      router.refresh();
    });
  }

  function handleDelete(serviceId: string) {
    if (!confirm("Hapus layanan ini?")) return;
    setFormError(null);
    setDeletingId(serviceId);
    startTransition(async () => {
      const result = await deleteService(outletSlug, serviceId);
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
        id="create-service-form"
        action={handleCreate}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-line p-4"
      >
        <div className="min-w-[180px] flex-1">
          <label htmlFor="name" className="block text-sm font-medium text-ink">
            Nama layanan
          </label>
          <input id="name" name="name" required className={inputClass} />
        </div>
        <div className="w-32">
          <label htmlFor="durationMin" className="block text-sm font-medium text-ink">
            Durasi (menit)
          </label>
          <input
            id="durationMin"
            name="durationMin"
            type="number"
            min={1}
            required
            className={inputClass}
          />
        </div>
        <div className="w-36">
          <label htmlFor="price" className="block text-sm font-medium text-ink">
            Harga (Rp)
          </label>
          <input id="price" name="price" type="number" min={0} required className={inputClass} />
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
              <th className="px-4 py-2 font-medium">Durasi</th>
              <th className="px-4 py-2 font-medium">Harga</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {initialServices.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-subtle">
                  Belum ada layanan.
                </td>
              </tr>
            )}
            {initialServices.map((service) =>
              editingId === service.id ? (
                <tr key={service.id}>
                  <td colSpan={4} className="px-4 py-3">
                    <form
                      action={(formData) => handleUpdate(service.id, formData)}
                      className="flex flex-wrap items-end gap-3"
                    >
                      <input
                        name="name"
                        defaultValue={service.name}
                        required
                        className="min-w-[160px] flex-1 rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
                      />
                      <input
                        name="durationMin"
                        type="number"
                        min={1}
                        defaultValue={service.durationMin}
                        required
                        className="w-28 rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
                      />
                      <input
                        name="price"
                        type="number"
                        min={0}
                        defaultValue={service.price}
                        required
                        className="w-32 rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
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
                <tr key={service.id}>
                  <td className="px-4 py-3 text-ink">{service.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{service.durationMin} menit</td>
                  <td className="px-4 py-3 text-ink-muted">{currency.format(service.price)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditingId(service.id)}
                      className="mr-3 text-sm font-medium text-ink-muted hover:underline"
                    >
                      Ubah
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      disabled={deletingId === service.id}
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
