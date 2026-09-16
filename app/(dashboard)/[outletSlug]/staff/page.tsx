"use client";

import { useEffect, useState } from "react";

type Staff = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
};

const emptyForm = { name: "", email: "", phone: "", role: "staff" };

export default function StaffPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadStaff() {
    setIsLoading(true);
    const res = await fetch("/api/staff");
    const data = await res.json();
    setStaffList(data.staff ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadStaff();
  }, []);

  function startEdit(staff: Staff) {
    setEditingId(staff.id);
    setForm({
      name: staff.name,
      email: staff.email,
      phone: staff.phone ?? "",
      role: staff.role,
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
      editingId ? `/api/staff/${editingId}` : "/api/staff",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      },
    );
    const data = await res.json();

    setIsSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal menyimpan staff.");
      return;
    }

    setForm(emptyForm);
    setEditingId(null);
    await loadStaff();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus staff ini? Booking yang udah terlanjur di-assign ke staff ini bakal dilepas (bukan ikut kehapus).")) return;
    const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadStaff();
    } else {
      const data = await res.json();
      alert(data.error ?? "Gagal menghapus staff.");
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Staff</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Data staff outlet kamu, dipakai buat assign booking per staff.
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
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-medium text-neutral-900">
            Email
          </label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div className="w-40">
          <label className="block text-sm font-medium text-neutral-900">
            No. HP
          </label>
          <input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div className="w-32">
          <label className="block text-sm font-medium text-neutral-900">
            Role
          </label>
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
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
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">No. HP</th>
              <th className="px-4 py-2 font-medium">Role</th>
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
            ) : staffList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">
                  Belum ada staff. Tambahin dulu lewat form di atas.
                </td>
              </tr>
            ) : (
              staffList.map((staff) => (
                <tr key={staff.id}>
                  <td className="px-4 py-3 text-neutral-900">{staff.name}</td>
                  <td className="px-4 py-3 text-neutral-600">{staff.email}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {staff.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 capitalize">
                    {staff.role}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => startEdit(staff)}
                      className="mr-3 text-neutral-600 underline underline-offset-4 hover:text-neutral-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(staff.id)}
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
