import { headers } from "next/headers";

/**
 * Base URL app ini (mis. "https://janjianyuk.com"), dipakai buat nyusun
 * link publik (link booking, dst) dari server component.
 *
 * Prioritas: header host asli request (jalan bener juga kalau outlet
 * akses lewat custom domain nanti), fallback ke NEXT_PUBLIC_APP_URL kalau
 * headers nggak kebaca (mis. dipanggil di luar request context).
 */
export async function getSiteUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto =
    h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");

  if (host) {
    return `${proto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
