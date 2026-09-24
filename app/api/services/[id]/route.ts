import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireActiveOutletSession } from "@/lib/api-session";
import { canonicalCategory, countServiceUsage } from "@/lib/service-store";
import { parseServiceInput } from "@/lib/services";

async function findOwnedService(id: string, outletId: string) {
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service || service.outletId !== outletId) return null;
  return service;
}

const IN_USE_MESSAGE =
  "Layanan ini sudah pernah dipakai di booking atau paket, jadi nggak bisa dihapus. Nonaktifkan aja supaya nggak muncul di booking baru.";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await findOwnedService(id, ctx.outletId);
  if (!existing) {
    return NextResponse.json(
      { error: "Layanan tidak ditemukan." },
      { status: 404 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Data layanan nggak valid." },
      { status: 400 },
    );
  }
  const b = body as Record<string, unknown>;

  // Dua bentuk request: cuma { isActive } (tombol aktif/nonaktifkan), atau
  // data layanan lengkap (form edit) — yang kedua divalidasi utuh biar nggak
  // ada layanan yang tersimpan setengah-setengah.
  const editsDetails = [
    "name",
    "category",
    "description",
    "durationMin",
    "price",
    "priceFrom",
  ].some((key) => key in b);

  const data: {
    name?: string;
    category?: string | null;
    description?: string | null;
    durationMin?: number;
    price?: number;
    priceFrom?: boolean;
    isActive?: boolean;
  } = {};

  if (editsDetails) {
    const parsed = parseServiceInput(b);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    Object.assign(data, parsed.data, {
      category: await canonicalCategory(ctx.outletId, parsed.data.category),
    });
  }

  if (typeof b.isActive === "boolean") data.isActive = b.isActive;

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Nggak ada yang diubah." },
      { status: 400 },
    );
  }

  const service = await prisma.service.update({ where: { id }, data });

  return NextResponse.json({ service });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await findOwnedService(id, ctx.outletId);
  if (!existing) {
    return NextResponse.json(
      { error: "Layanan tidak ditemukan." },
      { status: 404 },
    );
  }

  // Booking dan paket nunjuk ke layanan lewat foreign key RESTRICT, jadi
  // hapus langsung bakal error 500 kalau layanannya pernah dipakai. Cek dulu
  // biar user dapat pesan yang jelas, bukan layar diam.
  if ((await countServiceUsage(id)) > 0) {
    return NextResponse.json({ error: IN_USE_MESSAGE }, { status: 409 });
  }

  try {
    await prisma.service.delete({ where: { id } });
  } catch {
    // Ada booking/paket baru yang nyelip di antara pengecekan dan hapus.
    return NextResponse.json({ error: IN_USE_MESSAGE }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
