import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

const TRIAL_DAYS = 14;

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uniqueSlug(base: string) {
  const baseSlug = slugify(base) || "outlet";
  let slug = baseSlug;
  let attempt = 0;

  // Coba slug polos dulu, kalau bentrok tambahin suffix angka.
  while (await prisma.outlet.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt + 1}`;
  }

  return slug;
}

export async function POST(request: Request) {
  const body = await request.json();
  const { outletName, ownerName, ownerEmail, ownerPhone, password } = body as {
    outletName?: string;
    ownerName?: string;
    ownerEmail?: string;
    ownerPhone?: string;
    password?: string;
  };

  if (!outletName || !ownerName || !ownerEmail || !ownerPhone || !password) {
    return NextResponse.json(
      { error: "Semua field wajib diisi." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password minimal 8 karakter." },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: ownerEmail },
  });
  if (existingUser) {
    return NextResponse.json(
      { error: "Email sudah terdaftar." },
      { status: 409 },
    );
  }

  const slug = await uniqueSlug(outletName);
  const passwordHash = await bcrypt.hash(password, 10);
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const outlet = await prisma.$transaction(async (tx) => {
    const createdOutlet = await tx.outlet.create({
      data: {
        name: outletName,
        slug,
        ownerName,
        ownerEmail,
        ownerPhone,
        trialEndsAt,
      },
    });

    await tx.user.create({
      data: {
        name: ownerName,
        email: ownerEmail,
        password: passwordHash,
        role: "owner",
        outletId: createdOutlet.id,
      },
    });

    return createdOutlet;
  });

  return NextResponse.json({ outletSlug: outlet.slug }, { status: 201 });
}
