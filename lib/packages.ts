import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

// Daftar layanan di dalam satu paket. Diurutkan per nama biar tampilannya
// konsisten ("Potong rambut + Warnain rambut" nggak loncat urutan tiap load).
export const packageItemsArgs = {
  select: { service: { select: { id: true, name: true } } },
  orderBy: { service: { name: "asc" } },
} satisfies Prisma.Package$itemsArgs;

export const packageInclude = {
  items: packageItemsArgs,
} satisfies Prisma.PackageInclude;

// customerPackages nggak punya kolom outletId langsung di schema — scope-nya
// lewat relasi customer.outletId (lihat app/api/customer-packages).
export const customerPackageInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  package: {
    select: {
      id: true,
      name: true,
      totalSessions: true,
      price: true,
      items: packageItemsArgs,
    },
  },
} satisfies Prisma.CustomerPackageInclude;

type ResolveServiceIdsResult =
  | { ok: true; serviceIds: string[] }
  | { ok: false; error: string; status: number };

/**
 * Validasi daftar layanan yang dikirim client waktu bikin/edit paket:
 * harus array id, minimal 1, dan semuanya milik outlet ini (biar outlet
 * lain nggak bisa nyelipin id layanan yang bukan miliknya). Id kembar
 * dibuang diam-diam — pilih "Potong" dua kali tetap satu layanan.
 */
export async function resolveServiceIds(
  input: unknown,
  outletId: string,
): Promise<ResolveServiceIdsResult> {
  if (
    !Array.isArray(input) ||
    input.length === 0 ||
    input.some((id) => typeof id !== "string")
  ) {
    return { ok: false, error: "Pilih minimal 1 layanan.", status: 400 };
  }

  const serviceIds = [...new Set(input as string[])];

  const found = await prisma.service.count({
    where: { id: { in: serviceIds }, outletId },
  });
  if (found !== serviceIds.length) {
    return { ok: false, error: "Layanan tidak ditemukan.", status: 404 };
  }

  return { ok: true, serviceIds };
}
