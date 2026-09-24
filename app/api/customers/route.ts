import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireActiveOutletSession } from "@/lib/api-session";
import { isUniqueViolation } from "@/lib/db-errors";
import { PHONE_ERROR, normalizePhone } from "@/lib/phone";

export async function GET() {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const customers = await prisma.customer.findMany({
    where: { outletId: ctx.outletId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ customers });
}

export async function POST(request: Request) {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const { name, phone: rawPhone, notes } = body as {
    name?: unknown;
    phone?: unknown;
    notes?: unknown;
  };

  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanNotes = typeof notes === "string" ? notes.trim() : "";

  if (!cleanName || typeof rawPhone !== "string" || !rawPhone.trim()) {
    return NextResponse.json(
      { error: "Nama dan no. HP wajib diisi." },
      { status: 400 },
    );
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
  }

  const duplicate = await prisma.customer.findUnique({
    where: { outletId_phone: { outletId: ctx.outletId, phone } },
    select: { name: true },
  });
  if (duplicate) {
    return NextResponse.json(
      { error: `No. HP ini sudah terdaftar atas nama ${duplicate.name}.` },
      { status: 409 },
    );
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        outletId: ctx.outletId,
        name: cleanName,
        phone,
        notes: cleanNotes || null,
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (err) {
    // Dua request barengan lolos cek di atas — unique index yang nahan.
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "No. HP ini sudah terdaftar di pelanggan lain." },
        { status: 409 },
      );
    }
    throw err;
  }
}
