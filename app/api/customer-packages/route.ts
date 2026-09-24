import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireActiveOutletSession } from "@/lib/api-session";
import { customerPackageInclude } from "@/lib/packages";

// Scope outlet lewat relasi customer.outletId (customerPackages nggak punya
// kolom outletId sendiri).
export async function GET(request: Request) {
  const ctx = await requireActiveOutletSession();
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
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const { customerId, packageId, expiresAt, amount, method } = body as {
    customerId?: string;
    packageId?: string;
    expiresAt?: string | null;
    amount?: number;
    method?: string;
  };

  if (!customerId || !packageId) {
    return NextResponse.json(
      { error: "Pelanggan dan paket wajib dipilih." },
      { status: 400 },
    );
  }
  if (amount === undefined || amount === null || Number.isNaN(amount) || amount < 0) {
    return NextResponse.json(
      { error: "Jumlah bayar wajib diisi dan tidak boleh negatif." },
      { status: 400 },
    );
  }
  if (!method || !["cash", "qris", "transfer"].includes(method)) {
    return NextResponse.json({ error: "Metode bayar tidak valid." }, { status: 400 });
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

  // Jual paket = pelanggan bayar di muka, jadi sekalian dicatat sebagai
  // Transaction "paid" di sini. Ini yang bikin penjualan paket otomatis
  // kehitung di total kasir & laporan bulanan — owner nggak perlu lagi
  // nyatet ulang manual di menu Kasir kayak sebelumnya.
  const customerPackage = await prisma.$transaction(async (tx) => {
    const created = await tx.customerPackage.create({
      data: { customerId, packageId, expiresAt: expiresAtDate },
    });
    await tx.transaction.create({
      data: {
        customerPackageId: created.id,
        amount,
        method,
        status: "paid",
        paidAt: new Date(),
      },
    });
    return tx.customerPackage.findUniqueOrThrow({
      where: { id: created.id },
      include: customerPackageInclude,
    });
  });

  return NextResponse.json({ customerPackage }, { status: 201 });
}
