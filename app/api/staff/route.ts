import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireActiveOutletSession } from "@/lib/api-session";

export async function GET() {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const staff = await prisma.staff.findMany({
    where: { outletId: ctx.outletId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ staff });
}

export async function POST(request: Request) {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const { name, email, phone, role } = body as {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
  };

  if (!name || !email) {
    return NextResponse.json(
      { error: "Nama dan email wajib diisi." },
      { status: 400 },
    );
  }

  const staffMember = await prisma.staff.create({
    data: {
      outletId: ctx.outletId,
      name,
      email,
      phone: phone || null,
      role: role || "staff",
    },
  });

  return NextResponse.json({ staff: staffMember }, { status: 201 });
}
