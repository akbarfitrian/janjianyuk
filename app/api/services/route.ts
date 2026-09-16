import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOutletSession } from "@/lib/api-session";

export async function GET() {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const services = await prisma.service.findMany({
    where: { outletId: ctx.outletId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ services });
}

export async function POST(request: Request) {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const { name, durationMin, price } = body as {
    name?: string;
    durationMin?: number;
    price?: number;
  };

  if (!name || !durationMin || price === undefined || price === null) {
    return NextResponse.json(
      { error: "Nama, durasi, dan harga wajib diisi." },
      { status: 400 },
    );
  }

  if (durationMin <= 0 || price < 0) {
    return NextResponse.json(
      { error: "Durasi dan harga harus angka yang valid." },
      { status: 400 },
    );
  }

  const service = await prisma.service.create({
    data: { outletId: ctx.outletId, name, durationMin, price },
  });

  return NextResponse.json({ service }, { status: 201 });
}
