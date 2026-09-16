import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOutletSession } from "@/lib/api-session";

const customerPackageInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  package: {
    select: {
      id: true,
      name: true,
      totalSessions: true,
      price: true,
      service: { select: { id: true, name: true } },
    },
  },
} as const;

// customerPackages nggak punya kolom outletId langsung di schema — scope-nya
// lewat relasi customer.outletId.
export async function GET(request: Request) {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");

  const customerPackages = await prisma.customerPackage.findMany({
    where: {
      customer: { outletId: ctx.outletId },
      ...(customerId ? { customerId } : {}),
    },
    include: customerPackageInclude,
    orderBy: { purchasedAt: "desc" },
  });

  return NextResponse.json({ customerPackages });
}

export async function POST(request: Request) {
  const ctx = await requireOutletSession();
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const { customerId, packageId, expiresAt } = body as {
    customerId?: string;
    packageId?: string;
    expiresAt?: string | null;
  };

  if (!customerId || !packageId) {
    return NextResponse.json(
      { error: "Pelanggan dan paket wajib dipilih." },
      { status: 400 },
    );
  }

  const [customer, pkg] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.package.findUnique({ where: { id: packageId } }),
  ]);

  if (!customer || customer.outletId !== ctx.outletId) {
    return NextResponse.json({ error: "Pelanggan tidak ditemukan." }, { status: 404 });
  }
  if (!pkg || pkg.outletId !== ctx.outletId) {
    return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 404 });
  }

  let expiresAtDate: Date | null = null;
  if (expiresAt) {
    expiresAtDate = new Date(expiresAt);
    if (Number.isNaN(expiresAtDate.getTime())) {
      return NextResponse.json(
        { error: "Tanggal kedaluwarsa tidak valid." },
        { status: 400 },
      );
    }
  }

  const customerPackage = await prisma.customerPackage.create({
    data: { customerId, packageId, expiresAt: expiresAtDate },
    include: customerPackageInclude,
  });

  return NextResponse.json({ customerPackage }, { status: 201 });
}
