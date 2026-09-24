// Pembatas spam buat booking publik — bagian yang butuh database / request.
// Angka batasnya ada di lib/booking-limits.ts.
//
// Yang dibatasi cuma booking yang BERHASIL dibuat (baris di database, slot
// yang kepakai, WA yang terkirim) — request yang gagal validasi nggak makan
// apa-apa, jadi nggak perlu dihitung.

import { createHmac } from "node:crypto";

import { prisma } from "@/lib/prisma";
import {
  MAX_ACTIVE_BOOKINGS_PER_PHONE,
  MAX_BOOKINGS_PER_IP_PER_HOUR,
  MAX_BOOKINGS_PER_PHONE_PER_HOUR,
  RATE_WINDOW_MS,
} from "@/lib/booking-limits";

// IPv6: satu pengguna biasanya dapat satu blok /64, jadi yang dihitung
// 4 kelompok pertama — kalau nggak, gampang ganti-ganti alamat di blok yang
// sama buat menghindari batas.
function normalizeIp(ip: string): string {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) return mapped[1];
  if (!ip.includes(":")) return ip; // IPv4

  const [head, tail] = ip.split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = tail === undefined ? [] : tail ? tail.split(":") : [];
  const fill =
    tail === undefined
      ? []
      : Array<string>(Math.max(8 - headGroups.length - tailGroups.length, 0)).fill("0");

  return [...headGroups, ...fill, ...tailGroups]
    .slice(0, 4)
    .map((g) => g.padStart(4, "0").toLowerCase())
    .join(":");
}

// IP klien (di Vercel, x-forwarded-for diisi platform), di-hash pakai HMAC
// biar yang tersimpan bukan IP asli. null kalau nggak ketahuan (mis. dev
// lokal) — batas per-IP dilewati, batas per-nomor tetap jalan.
//
// Catatan: header ini cuma bisa dipercaya di belakang proxy yang menimpanya
// (Vercel, Cloudflare, dll). Kalau app dijalankan langsung ke internet tanpa
// proxy, klien bisa memalsukannya.
export function getClientIpHash(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];
  const ip = (forwarded ?? request.headers.get("x-real-ip") ?? "").trim();
  if (!ip) return null;

  const secret = process.env.IP_HASH_SECRET || "janjianyuk-ip-hash";
  return createHmac("sha256", secret).update(normalizeIp(ip)).digest("hex");
}

export async function checkBookingRateLimits({
  outletId,
  phone,
  ipHash,
  now = Date.now(),
}: {
  outletId: string;
  phone: string; // sudah dinormalisasi (628…)
  ipHash: string | null;
  now?: number;
}): Promise<{ error: string } | null> {
  const since = new Date(now - RATE_WINDOW_MS);

  const [active, recentByPhone, recentByIp] = await Promise.all([
    prisma.booking.count({
      where: {
        outletId,
        customer: { phone },
        status: { in: ["pending", "confirmed"] },
        startTime: { gte: new Date(now) },
      },
    }),
    prisma.booking.count({
      where: { outletId, customer: { phone }, createdAt: { gte: since } },
    }),
    ipHash
      ? prisma.publicBookingEvent.count({
          where: { outletId, ipHash, createdAt: { gte: since } },
        })
      : Promise.resolve(0),
  ]);

  if (active >= MAX_ACTIVE_BOOKINGS_PER_PHONE) {
    return {
      error: `Nomor ini sudah punya ${MAX_ACTIVE_BOOKINGS_PER_PHONE} booking yang belum berlangsung. Hubungi outlet kalau perlu booking tambahan.`,
    };
  }
  if (recentByPhone >= MAX_BOOKINGS_PER_PHONE_PER_HOUR) {
    return {
      error:
        "Terlalu banyak booking dari nomor ini dalam waktu singkat. Coba lagi nanti atau hubungi outlet.",
    };
  }
  if (recentByIp >= MAX_BOOKINGS_PER_IP_PER_HOUR) {
    return {
      error:
        "Terlalu banyak booking dari jaringan ini dalam waktu singkat. Coba lagi nanti atau hubungi outlet.",
    };
  }
  return null;
}

// Catat satu booking publik yang berhasil, buat hitungan batas per-IP. Jejak
// lebih dari sehari dihapus sekalian (sesekali, biar nggak tiap request).
// Gagal nyatat nggak boleh menggagalkan booking yang sudah jadi.
export async function recordPublicBooking(
  outletId: string,
  ipHash: string | null,
) {
  if (!ipHash) return;
  try {
    await prisma.publicBookingEvent.create({ data: { outletId, ipHash } });
    if (Math.random() < 0.05) {
      await prisma.publicBookingEvent.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - 24 * RATE_WINDOW_MS) } },
      });
    }
  } catch (err) {
    console.warn("[public bookings] gagal nyatat jejak rate limit:", err);
  }
}
