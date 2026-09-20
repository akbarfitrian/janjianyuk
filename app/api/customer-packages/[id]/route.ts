import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOutletSession } from "@/lib/api-session";
import { customerPackageInclude } from "@/lib/packages";

async function findOwnedCustomerPackage(id: string, outletId: string) {
  const cp = await prisma.customerPackage.findUnique({
    where: { id },
    include: {
      customer: { select: { outletId: true } },
      package: { select: { totalSessions: true } },
    },
  });
  if (!cp || cp.customer.outletId !== outletId) return null;
  return cp;
}

// Pakai (+1 sesi) atau batalin pemakaian (-1 sesi, buat koreksi salah klik).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await findOwnedCustomerPackage(id, ctx.outletId);
  if (!existing) {
    return NextResponse.json(
      { error: "Paket pelanggan tidak ditemukan." },
      { status: 404 },
    );
  }

  const body = await request.json();
  const { action } = body as { action?: "use" | "undo" };

  if (action === "use") {
    if (existing.expiresAt && existing.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Paket ini udah kedaluwarsa." },
        { status: 400 },
      );
    }
    if (existing.usedSessions >= existing.package.totalSessions) {
      return NextResponse.json(
        { error: "Sesi paket ini udah habis." },
        { status: 400 },
      );
    }
  } else if (action === "undo") {
    if (existing.usedSessions <= 0) {
      return NextResponse.json(
        { error: "Belum ada sesi yang dipakai." },
        { status: 400 },
      );
    }
  } else {
    return NextResponse.json({ error: "Aksi tidak valid." }, { status: 400 });
  }

  const customerPackage = await prisma.customerPackage.update({
    where: { id },
    data: { usedSessions: existing.usedSessions + (action === "use" ? 1 : -1) },
    include: customerPackageInclude,
  });

  return NextResponse.json({ customerPackage });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await findOwnedCustomerPackage(id, ctx.outletId);
  if (!existing) {
    return NextResponse.json(
      { error: "Paket pelanggan tidak ditemukan." },
      { status: 404 },
    );
  }

  await prisma.customerPackage.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
