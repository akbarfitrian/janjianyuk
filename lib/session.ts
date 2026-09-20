import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type AppSessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  outletId: string | null;
  outletSlug: string | null;
};

const withOutlet = { outlet: { select: { slug: true } } } as const;

/**
 * Cari baris User (data bisnis) buat user Supabase Auth ini.
 *
 * 1. Cari by id (uuid Supabase) — kasus normal.
 * 2. Kalau nggak ada, cari by email. Akun yang dibuat sebelum pindah ke
 *    Google (era NextAuth) id-nya cuid, bukan uuid, jadi lookup by id nggak
 *    bakal pernah ketemu — user-nya malah dianggap baru dan mentok di
 *    /onboarding karena email/outlet-nya udah kepakai. Kalau ketemu, id-nya
 *    diganti ke uuid Supabase ("adopsi") biar outlet & datanya nyambung lagi.
 *
 * Adopsi cuma jalan kalau email Google-nya terverifikasi, biar nggak ada yang
 * bisa ngambil alih akun orang lain cuma dengan daftar pakai email yang sama.
 */
export async function findOrAdoptDbUser(authUser: SupabaseAuthUser) {
  const byId = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: withOutlet,
  });
  if (byId) return byId;

  const email = authUser.email;
  const emailVerified =
    Boolean(authUser.email_confirmed_at) ||
    authUser.user_metadata?.email_verified === true;
  if (!email || !emailVerified) return null;

  const legacy = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (!legacy) return null;

  try {
    return await prisma.user.update({
      where: { id: legacy.id },
      data: { id: authUser.id },
      include: withOutlet,
    });
  } catch {
    // Request lain (mis. callback dan getCurrentUser jalan barengan) udah
    // ngadopsi duluan — tinggal ambil hasilnya.
    return prisma.user.findUnique({
      where: { id: authUser.id },
      include: withOutlet,
    });
  }
}

/**
 * Pengganti `auth()` dari NextAuth. Dua langkah:
 * 1. Validasi ke Supabase Auth (`getUser()`, bukan `getSession()` — ini
 *    yang beneran dicek ulang ke server Supabase, bukan cuma baca cookie).
 * 2. Ambil data bisnis (role, outletId) dari tabel User di Prisma, key-nya
 *    sama persis dengan id user Supabase Auth (uuid).
 *
 * Balikin null kalau belum login ATAU udah login tapi belum pernah
 * nyelesain /onboarding (baris User-nya belum ada / belum ke-link ke
 * outlet manapun) — caller yang nentuin mau redirect ke /login atau
 * /onboarding.
 */
export async function getCurrentUser(): Promise<AppSessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const dbUser = await findOrAdoptDbUser(authUser);

  if (!dbUser) return null;

  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    outletId: dbUser.outletId,
    outletSlug: dbUser.outlet?.slug ?? null,
  };
}
