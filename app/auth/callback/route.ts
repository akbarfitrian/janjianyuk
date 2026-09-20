import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { findOrAdoptDbUser } from "@/lib/session";

/**
 * Redirect target dari Google OAuth (dipasang di
 * NEXT_PUBLIC_SUPABASE_URL/auth/v1/callback lewat dashboard Supabase, yang
 * pada akhirnya balik lagi kesini). Tukar `code` jadi session, cek apakah
 * user ini udah punya outlet — kalau belum, ini login pertama kalinya
 * (register), arahkan ke /onboarding buat lengkapin data outlet.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Termasuk akun lama (era NextAuth) yang id-nya beda — di-link by email.
        const dbUser = await findOrAdoptDbUser(user);

        if (dbUser?.outlet?.slug) {
          return NextResponse.redirect(`${origin}/${dbUser.outlet.slug}`);
        }

        return NextResponse.redirect(`${origin}/onboarding`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
