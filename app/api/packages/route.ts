import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOutletSession } from "@/lib/api-session";
import { packageInclude, resolveServiceIds } from "@/lib/packages";

export async function GET() {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const packages = await prisma.package.findMany({
    where: { outletId: ctx.outletId },
    include: packageInclude,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ packages });
}

export async function POST(request: Request) {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const { name, serviceIds, totalSessions, price } = body as {
    name?: string;
    serviceIds?: string[];
    totalSessions?: number;
    price?: number;
  };

  if (!name || !totalSessions || price === undefined || price === null) {
    return NextResponse.json(
      { error: "Nama, jumlah sesi, dan harga wajib diisi." },
      { status: 400 },
    );
  }
  if (totalSessions <= 0 || price < 0) {
    return NextResponse.json(
      { error: "Jumlah sesi dan harga harus angka yang valid." },
      { status: 400 },
    );
  }

  const services = await resolveServiceIds(serviceIds, ctx.outletId);
  if (!services.ok) {
    return NextResponse.json({ error: services.error }, { status: services.status });
  }

  const pkg = await prisma.package.create({
    data: {
      outletId: ctx.outletId,
      name,
      totalSessions,
      price,
      items: {
        create: services.serviceIds.map((serviceId) => ({ serviceId })),
      },
    },
    include: packageInclude,
  });

  return NextResponse.json({ package: pkg }, { status: 201 });
}
