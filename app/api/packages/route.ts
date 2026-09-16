import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOutletSession } from "@/lib/api-session";

export async function GET() {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const packages = await prisma.package.findMany({
    where: { outletId: ctx.outletId },
    include: { service: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ packages });
}

export async function POST(request: Request) {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const { name, serviceId, totalSessions, price } = body as {
    name?: string;
    serviceId?: string;
    totalSessions?: number;
    price?: number;
  };

  if (!name || !serviceId || !totalSessions || price === undefined || price === null) {
    return NextResponse.json(
      { error: "Nama, layanan, jumlah sesi, dan harga wajib diisi." },
      { status: 400 },
    );
  }
  if (totalSessions <= 0 || price < 0) {
    return NextResponse.json(
      { error: "Jumlah sesi dan harga harus angka yang valid." },
      { status: 400 },
    );
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || service.outletId !== ctx.outletId) {
    return NextResponse.json({ error: "Layanan tidak ditemukan." }, { status: 404 });
  }

  const pkg = await prisma.package.create({
    data: { outletId: ctx.outletId, name, serviceId, totalSessions, price },
    include: { service: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ package: pkg }, { status: 201 });
}
