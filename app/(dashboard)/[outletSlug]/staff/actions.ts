"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireOutletId } from "@/lib/session-outlet";

type ActionResult = { error: string | null };

const ROLES = ["admin", "staff"] as const;

function parseStaffInput(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const role = String(formData.get("role") ?? "staff");

  if (!name) return { error: "Nama wajib diisi." } as const;
  if (!email) return { error: "Email wajib diisi." } as const;
  if (!ROLES.includes(role as (typeof ROLES)[number]))
    return { error: "Role tidak valid." } as const;

  return { error: null, name, email, phone: phone || null, role } as const;
}

export async function createStaff(
  outletSlug: string,
  formData: FormData,
): Promise<ActionResult> {
  const outletId = await requireOutletId();
  const parsed = parseStaffInput(formData);
  if (parsed.error) return { error: parsed.error };

  await prisma.staff.create({
    data: {
      outletId,
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      role: parsed.role,
    },
  });

  revalidatePath(`/${outletSlug}/staff`);
  return { error: null };
}

export async function updateStaff(
  outletSlug: string,
  staffId: string,
  formData: FormData,
): Promise<ActionResult> {
  const outletId = await requireOutletId();
  const parsed = parseStaffInput(formData);
  if (parsed.error) return { error: parsed.error };

  const result = await prisma.staff.updateMany({
    where: { id: staffId, outletId },
    data: {
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      role: parsed.role,
    },
  });

  if (result.count === 0) return { error: "Staff tidak ditemukan." };

  revalidatePath(`/${outletSlug}/staff`);
  return { error: null };
}

export async function deleteStaff(
  outletSlug: string,
  staffId: string,
): Promise<ActionResult> {
  const outletId = await requireOutletId();

  try {
    const result = await prisma.staff.deleteMany({
      where: { id: staffId, outletId },
    });
    if (result.count === 0) return { error: "Staff tidak ditemukan." };
  } catch {
    return { error: "Staff masih punya riwayat booking, tidak bisa dihapus." };
  }

  revalidatePath(`/${outletSlug}/staff`);
  return { error: null };
}
