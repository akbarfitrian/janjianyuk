// Helper murni buat fitur Layanan — nggak ada import Prisma di sini, jadi
// aman dipakai dari komponen client (halaman Layanan, form booking publik)
// maupun API route.

export const SERVICE_LIMITS = {
  name: 80,
  category: 40,
  description: 200,
  durationMin: 600, // 10 jam
  price: 100_000_000,
} as const;

// Saran kategori buat outlet yang belum punya satu pun. Sengaja pendek dan
// umum biar cocok buat barbershop, salon, maupun klinik.
export const DEFAULT_CATEGORY_SUGGESTIONS = [
  "Potong",
  "Warna",
  "Perawatan",
  "Treatment",
];

export const UNCATEGORIZED_LABEL = "Lainnya";

export const DURATION_PRESETS: { minutes: number; label: string }[] = [
  { minutes: 15, label: "15 mnt" },
  { minutes: 30, label: "30 mnt" },
  { minutes: 45, label: "45 mnt" },
  { minutes: 60, label: "1 jam" },
  { minutes: 90, label: "1,5 jam" },
  { minutes: 120, label: "2 jam" },
];

export function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

export function formatServicePrice(price: number, priceFrom: boolean) {
  return priceFrom ? `Mulai ${formatRupiah(price)}` : formatRupiah(price);
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} jam` : `${hours} jam ${rest} menit`;
}

export function normalizeCategory(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().replace(/\s+/g, " ");
  return value === "" ? null : value;
}

export type ServiceGroup<T> = {
  key: string;
  category: string | null;
  label: string;
  items: T[];
};

/**
 * Kelompokin layanan per kategori. Urutan kategori ngikutin kemunculan
 * pertamanya di daftar (jadi owner bisa ngatur urutan cukup dengan urutan
 * nambahin layanan), kategori dibandingin tanpa peduli huruf besar/kecil,
 * dan layanan tanpa kategori selalu di paling bawah.
 */
export function groupByCategory<T extends { category: string | null }>(
  items: T[],
): ServiceGroup<T>[] {
  const groups = new Map<string, ServiceGroup<T>>();
  let uncategorized: ServiceGroup<T> | null = null;

  for (const item of items) {
    if (!item.category) {
      if (!uncategorized) {
        uncategorized = {
          key: "__none__",
          category: null,
          label: UNCATEGORIZED_LABEL,
          items: [],
        };
      }
      uncategorized.items.push(item);
      continue;
    }

    const key = item.category.toLowerCase();
    let group = groups.get(key);
    if (!group) {
      group = { key, category: item.category, label: item.category, items: [] };
      groups.set(key, group);
    }
    group.items.push(item);
  }

  const result = [...groups.values()];
  if (uncategorized) result.push(uncategorized);
  return result;
}

export type ServiceInput = {
  name: string;
  category: string | null;
  description: string | null;
  durationMin: number;
  price: number;
  priceFrom: boolean;
};

type ParseResult =
  | { ok: true; data: ServiceInput }
  | { ok: false; error: string };

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return NaN;
}

function fail(error: string): ParseResult {
  return { ok: false, error };
}

/** Validasi + rapihin body layanan dari client. Dipakai POST dan PATCH. */
export function parseServiceInput(body: unknown): ParseResult {
  if (!body || typeof body !== "object") {
    return fail("Data layanan nggak valid.");
  }
  const b = body as Record<string, unknown>;

  const name =
    typeof b.name === "string" ? b.name.trim().replace(/\s+/g, " ") : "";
  if (!name) return fail("Nama layanan wajib diisi.");
  if (name.length > SERVICE_LIMITS.name) {
    return fail(`Nama layanan maksimal ${SERVICE_LIMITS.name} karakter.`);
  }

  const category = normalizeCategory(b.category);
  if (category && category.length > SERVICE_LIMITS.category) {
    return fail(`Kategori maksimal ${SERVICE_LIMITS.category} karakter.`);
  }

  const descriptionRaw =
    typeof b.description === "string" ? b.description.trim() : "";
  if (descriptionRaw.length > SERVICE_LIMITS.description) {
    return fail(`Deskripsi maksimal ${SERVICE_LIMITS.description} karakter.`);
  }

  const durationMin = toNumber(b.durationMin);
  if (
    !Number.isInteger(durationMin) ||
    durationMin < 1 ||
    durationMin > SERVICE_LIMITS.durationMin
  ) {
    return fail(
      `Durasi harus angka bulat antara 1 sampai ${SERVICE_LIMITS.durationMin} menit.`,
    );
  }

  const price = toNumber(b.price);
  if (!Number.isInteger(price) || price < 0 || price > SERVICE_LIMITS.price) {
    return fail(
      `Harga harus angka bulat antara 0 sampai ${formatRupiah(SERVICE_LIMITS.price)}.`,
    );
  }

  return {
    ok: true,
    data: {
      name,
      category,
      description: descriptionRaw === "" ? null : descriptionRaw,
      durationMin,
      price,
      priceFrom: b.priceFrom === true,
    },
  };
}
