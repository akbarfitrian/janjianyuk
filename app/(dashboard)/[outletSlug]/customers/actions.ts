"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireOutletId } from "@/lib/session-outlet";

type ActionResult = { error: string | null };

function parseCustomerInput(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) return { error: "Nama wajib diisi." } as const;
  if (!phone) return { error: "No. HP wajib diisi." } as const;

  return { error: null, name, phone, notes: notes || null } as const;
}

export async function createCustomer(
  outletSlug: string,
  formData: FormData,
): Promise<ActionResult> {
  const outletId = await requireOutletId();
  const parsed = parseCustomerInput(formData);
  if (parsed.error) return { error: parsed.error };

  await prisma.customer.create({
    data: {
      outletId,
      name: parsed.name,
      phone: parsed.phone,
      notes: parsed.notes,
    },
  });

  revalidatePath(`/${outletSlug}/customers`);
  return { error: null };
}

export async function updateCustomer(
  outletSlug: string,
  customerId: string,
  formData: FormData,
): Promise<ActionResult> {
  const outletId = await requireOutletId();
  const parsed = parseCustomerInput(formData);
  if (parsed.error) return { error: parsed.error };

  const result = await prisma.customer.updateMany({
    where: { id: customerId, outletId },
    data: {
      name: parsed.name,
      phone: parsed.phone,
      notes: parsed.notes,
    },
  });

  if (result.count === 0) return { error: "Pelanggan tidak ditemukan." };

  revalidatePath(`/${outletSlug}/customers`);
  return { error: null };
}

export async function deleteCustomer(
  outletSlug: string,
  customerId: string,
): Promise<ActionResult> {
  const outletId = await requireOutletId();

  try {
    const result = await prisma.customer.deleteMany({
      where: { id: customerId, outletId },
    });
    if (result.count === 0) return { error: "Pelanggan tidak ditemukan." };
  } catch {
    return {
      error: "Pelanggan masih punya riwayat booking, tidak bisa dihapus.",
    };
  }

  revalidatePath(`/${outletSlug}/customers`);
  return { error: null };
}
