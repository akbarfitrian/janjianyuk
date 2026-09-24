import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireActiveOutletSession } from "@/lib/api-session";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/db-errors";
import { PHONE_ERROR, normalizePhone } from "@/lib/phone";

async function findOwnedCustomer(id: string, outletId: string) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer || customer.outletId !== outletId) return null;
  return customer;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await findOwnedCustomer(id, ctx.outletId);
  if (!existing) {
    return NextResponse.json(
      { error: "Pelanggan tidak ditemukan." },
      { status: 404 },
    );
  }

  const body = await request.json();
  const { name, phone, notes } = body as {
    name?: unknown;
    phone?: unknown;
    notes?: unknown;
  };

  const data: { name?: string; phone?: string; notes?: string | null } = {};

  if (name !== undefined) {
    const cleanName = typeof name === "string" ? name.trim() : "";
    if (!cleanName) {
      return NextResponse.json(
        { error: "Nama tidak boleh kosong." },
        { status: 400 },
      );
    }
    data.name = cleanName;
  }

  if (phone !== undefined) {
    const cleanPhone = typeof phone === "string" ? normalizePhone(phone) : null;
    if (!cleanPhone) {
      return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
    }

    if (cleanPhone !== existing.phone) {
      const duplicate = await prisma.customer.findUnique({
        where: { outletId_phone: { outletId: ctx.outletId, phone: cleanPhone } },
        select: { name: true },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `No. HP ini sudah terdaftar atas nama ${duplicate.name}.` },
          { status: 409 },
        );
      }
    }
    data.phone = cleanPhone;
  }

  if (notes !== undefined) {
    data.notes = typeof notes === "string" ? notes.trim() || null : null;
  }

  try {
    const customer = await prisma.customer.update({ where: { id }, data });
    return NextResponse.json({ customer });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "No. HP ini sudah terdaftar di pelanggan lain." },
        { status: 409 },
      );
    }
    throw err;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await findOwnedCustomer(id, ctx.outletId);
  if (!existing) {
    return NextResponse.json(
      { error: "Pelanggan tidak ditemukan." },
      { status: 404 },
    );
  }

  const [bookingCount, packageCount] = await Promise.all([
    prisma.booking.count({ where: { customerId: id } }),
    prisma.customerPackage.count({ where: { customerId: id } }),
  ]);

  if (bookingCount > 0) {
    return NextResponse.json(
      {
        error:
          "Pelanggan ini punya riwayat booking, tidak bisa dihapus. Hapus booking-nya dulu kalau memang perlu.",
      },
      { status: 409 },
    );
  }

  if (packageCount > 0) {
    return NextResponse.json(
      {
        error:
          "Pelanggan ini punya paket/membership, tidak bisa dihapus. Hapus paketnya dulu di menu Paket kalau memang perlu.",
      },
      { status: 409 },
    );
  }

  try {
    await prisma.customer.delete({ where: { id } });
  } catch (err) {
    // Jaring pengaman kalau ada relasi baru ke Customer yang belum dicek di
    // atas, atau ada booking/paket masuk persis di antara cek dan hapus.
    if (isForeignKeyViolation(err)) {
      return NextResponse.json(
        {
          error:
            "Pelanggan ini masih dipakai data lain (booking atau paket), tidak bisa dihapus.",
        },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
