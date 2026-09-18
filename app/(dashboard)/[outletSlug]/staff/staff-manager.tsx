"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createStaff, deleteStaff, updateStaff } from "./actions";

type StaffItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  staff: "Staff",
};

const inputClass =
  "mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none";

export function StaffManager({
  outletSlug,
  initialStaff,
}: {
  outletSlug: string;
  initialStaff: StaffItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setFormError(null);
    startTransition(async () => {
      const result = await createStaff(outletSlug, formData);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      (
        document.getElementById("create-staff-form") as HTMLFormElement | null
      )?.reset();
      router.refresh();
    });
  }

  function handleUpdate(staffId: string, formData: FormData) {
    setFormError(null);
    startTransition(async () => {
      const result = await updateStaff(outletSlug, staffId, formData);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setEditingId(null);
      router.refresh();
    });
  }

  function handleDelete(staffId: string) {
    if (!confirm("Hapus staff ini?")) return;
    setFormError(null);
    setDeletingId(staffId);
    startTransition(async () => {
      const result = await deleteStaff(outletSlug, staffId);
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
        id="create-staff-form"
        action={handleCreate}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-line p-4"
      >
        <div className="min-w-[160px] flex-1">
          <label htmlFor="name" className="block text-sm font-medium text-ink">
            Nama
          </label>
          <input id="name" name="name" required className={inputClass} />
        </div>
        <div className="min-w-[180px] flex-1">
          <label htmlFor="email" className="block text-sm font-medium text-ink">
            Email
          </label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>
        <div className="w-40">
          <label htmlFor="phone" className="block text-sm font-medium text-ink">
            No. HP (opsional)
          </label>
          <input id="phone" name="phone" className={inputClass} />
        </div>
        <div className="w-32">
          <label htmlFor="role" className="block text-sm font-medium text-ink">
            Role
          </label>
          <select id="role" name="role" defaultValue="staff" className={inputClass}>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
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
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">No. HP</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {initialStaff.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-subtle">
                  Belum ada staff.
                </td>
              </tr>
            )}
            {initialStaff.map((member) =>
              editingId === member.id ? (
                <tr key={member.id}>
                  <td colSpan={5} className="px-4 py-3">
                    <form
                      action={(formData) => handleUpdate(member.id, formData)}
                      className="flex flex-wrap items-end gap-3"
                    >
                      <input
                        name="name"
                        defaultValue={member.name}
                        required
                        className="min-w-[140px] flex-1 rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
                      />
                      <input
                        name="email"
                        type="email"
                        defaultValue={member.email}
                        required
                        className="min-w-[160px] flex-1 rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
                      />
                      <input
                        name="phone"
                        defaultValue={member.phone ?? ""}
                        className="w-36 rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
                      />
                      <select
                        name="role"
                        defaultValue={member.role}
                        className="w-28 rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none"
                      >
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
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
                <tr key={member.id}>
                  <td className="px-4 py-3 text-ink">{member.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{member.email}</td>
                  <td className="px-4 py-3 text-ink-muted">{member.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{ROLE_LABEL[member.role] ?? member.role}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditingId(member.id)}
                      className="mr-3 text-sm font-medium text-ink-muted hover:underline"
                    >
                      Ubah
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      disabled={deletingId === member.id}
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
