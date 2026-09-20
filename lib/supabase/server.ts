import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client sisi server. Dipanggil ulang tiap request (bukan
 * disimpen sebagai singleton) karena butuh cookies() request yang lagi
 * jalan buat baca/refresh access token.
 *
 * `setAll` bisa gagal dipanggil dari Server Component murni (Next.js
 * nggak izinin Server Component nulis cookie) — itu udah aman diabaikan
 * di sini selama `middleware.ts` yang jalan di tiap request tetap ada
 * buat refresh token-nya. Lihat lib/supabase/middleware.ts.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Dipanggil dari Server Component — aman diabaikan, lihat
            // catatan di atas.
          }
        },
      },
    },
  );
}
