import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireActiveOutletSession } from "@/lib/api-session";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireActiveOutletSession();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await prisma.outletClosure.findUnique({ where: { id } });
  if (!existing || existing.outletId !== ctx.outletId) {
    return NextResponse.json(
      { error: "Tanggal libur tidak ditemukan." },
      { status: 404 },
    );
  }

  await prisma.outletClosure.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
