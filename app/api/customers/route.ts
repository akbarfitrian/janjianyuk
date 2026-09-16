import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOutletSession } from "@/lib/api-session";

export async function GET() {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const customers = await prisma.customer.findMany({
    where: { outletId: ctx.outletId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ customers });
}

export async function POST(request: Request) {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const { name, phone, notes } = body as {
    name?: string;
    phone?: string;
    notes?: string;
  };

  if (!name || !phone) {
    return NextResponse.json(
      { error: "Nama dan no. HP wajib diisi." },
      { status: 400 },
    );
  }

  const customer = await prisma.customer.create({
    data: { outletId: ctx.outletId, name, phone, notes: notes || null },
  });

  return NextResponse.json({ customer }, { status: 201 });
}
