"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireOutletId } from "@/lib/session-outlet";

type ActionResult = { error: string | null };

function parseServiceInput(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const durationMin = Number(formData.get("durationMin"));
  const price = Number(formData.get("price"));

  if (!name) return { error: "Nama layanan wajib diisi." } as const;
  if (!Number.isFinite(durationMin) || durationMin <= 0)
    return { error: "Durasi harus angka lebih dari 0." } as const;
  if (!Number.isFinite(price) || price < 0)
    return { error: "Harga harus angka 0 atau lebih." } as const;

  return { error: null, name, durationMin, price } as const;
}

export async function createService(
  outletSlug: string,
  formData: FormData,
): Promise<ActionResult> {
  const outletId = await requireOutletId();
  const parsed = parseServiceInput(formData);
  if (parsed.error) return { error: parsed.error };

  await prisma.service.create({
    data: {
      outletId,
      name: parsed.name,
      durationMin: parsed.durationMin,
      price: parsed.price,
    },
  });

  revalidatePath(`/${outletSlug}/services`);
  return { error: null };
}

export async function updateService(
  outletSlug: string,
  serviceId: string,
  formData: FormData,
): Promise<ActionResult> {
  const outletId = await requireOutletId();
  const parsed = parseServiceInput(formData);
  if (parsed.error) return { error: parsed.error };

  const result = await prisma.service.updateMany({
    where: { id: serviceId, outletId },
    data: {
      name: parsed.name,
      durationMin: parsed.durationMin,
      price: parsed.price,
    },
  });

  if (result.count === 0) return { error: "Layanan tidak ditemukan." };

  revalidatePath(`/${outletSlug}/services`);
  return { error: null };
}

export async function deleteService(
  outletSlug: string,
  serviceId: string,
): Promise<ActionResult> {
  const outletId = await requireOutletId();

  try {
    const result = await prisma.service.deleteMany({
      where: { id: serviceId, outletId },
    });
    if (result.count === 0) return { error: "Layanan tidak ditemukan." };
  } catch {
    return {
      error: "Layanan masih dipakai di booking/paket, tidak bisa dihapus.",
    };
  }

  revalidatePath(`/${outletSlug}/services`);
  return { error: null };
}
