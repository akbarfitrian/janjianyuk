import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresh access token Supabase (kalau udah mepet expired) di tiap
 * request lewat middleware. WAJIB ada — tanpa ini, Server Component yang
 * manggil `supabase.auth.getUser()` bisa dapet token yang udah basi,
 * karena Server Component sendiri nggak bisa nulis cookie baru.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Jangan hapus — ini yang bikin token ke-refresh. `getUser()` sengaja
  // dipakai (bukan `getSession()`) karena tervalidasi ke server Supabase,
  // bukan cuma baca cookie mentah-mentah.
  await supabase.auth.getUser();

  return supabaseResponse;
}
