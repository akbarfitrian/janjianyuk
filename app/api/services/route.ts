import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireActiveOutletSession } from "@/lib/api-session";
import { canonicalCategory } from "@/lib/service-store";
import { parseServiceInput } from "@/lib/services";

// Default cuma balikin layanan yang aktif — dipakai form booking manual dan
// halaman Paket, yang nggak boleh nawarin layanan nonaktif. Halaman Layanan
// sendiri minta semuanya lewat ?all=1.
export async function GET(request: Request) {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const includeInactive =
    new URL(request.url).searchParams.get("all") === "1";

  const rows = await prisma.service.findMany({
    where: {
      outletId: ctx.outletId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { bookings: true, packageItems: true } } },
  });

  const services = rows.map(({ _count, ...service }) => ({
    ...service,
    usedCount: _count.bookings + _count.packageItems,
  }));

  return NextResponse.json({ services });
}

export async function POST(request: Request) {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const body = await request.json().catch(() => null);
  const parsed = parseServiceInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const category = await canonicalCategory(
    ctx.outletId,
    parsed.data.category,
  );

  const service = await prisma.service.create({
    data: { outletId: ctx.outletId, ...parsed.data, category },
  });

  return NextResponse.json({ service }, { status: 201 });
}
