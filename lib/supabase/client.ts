import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client sisi browser — dipakai di Client Component yang manggil
 * signInWithOAuth (tombol Google) atau signOut (menu user di dashboard).
 * Session-nya disimpen di cookie (bukan localStorage) biar bisa dibaca
 * server component/middleware juga.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
