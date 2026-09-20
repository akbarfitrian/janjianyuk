import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { findOrAdoptDbUser } from "@/lib/session";
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
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const existingUser = await findOrAdoptDbUser(authUser);

  if (existingUser?.outletId) {
    return NextResponse.json(
      { error: "Akun ini udah terhubung ke outlet." },
      { status: 409 },
    );
  }

  const body = await request.json();
  const { outletName, ownerPhone } = body as {
    outletName?: string;
    ownerPhone?: string;
  };

  if (!outletName || !ownerPhone) {
    return NextResponse.json(
      { error: "Semua field wajib diisi." },
      { status: 400 },
    );
  }

  const ownerEmail = authUser.email;
  if (!ownerEmail) {
    return NextResponse.json(
      { error: "Akun Google ini nggak punya email." },
      { status: 400 },
    );
  }

  const ownerName =
    existingUser?.name ??
    (authUser.user_metadata?.full_name as string | undefined) ??
    (authUser.user_metadata?.name as string | undefined) ??
    "Pemilik outlet";
  const avatarUrl =
    existingUser?.image ??
    (authUser.user_metadata?.avatar_url as string | undefined) ??
    null;

  const slug = await uniqueSlug(outletName);
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

    // Baris User mungkin udah dibuat parsial di kunjungan sebelumnya kalau
    // user sempet nyasar ke /onboarding tapi belum submit — upsert biar
    // idempoten.
    await tx.user.upsert({
      where: { id: authUser.id },
      create: {
        id: authUser.id,
        email: ownerEmail,
        name: ownerName,
        image: avatarUrl,
        role: "owner",
        outletId: createdOutlet.id,
      },
      update: {
        outletId: createdOutlet.id,
      },
    });

    return createdOutlet;
  });

  return NextResponse.json({ outletSlug: outlet.slug }, { status: 201 });
}
