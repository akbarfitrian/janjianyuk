import { prisma } from "@/lib/prisma";

/**
 * Kalau kategori yang diketik cuma beda huruf besar/kecil dari kategori yang
 * sudah ada di outlet ini ("potong" vs "Potong"), pakai penulisan yang sudah
 * ada — biar daftar nggak kepecah jadi dua kelompok yang sebenarnya sama.
 */
export async function canonicalCategory(
  outletId: string,
  category: string | null,
): Promise<string | null> {
  if (!category) return null;

  const existing = await prisma.service.findMany({
    where: { outletId, category: { not: null } },
    distinct: ["category"],
    select: { category: true },
  });

  const match = existing.find(
    (row) => row.category?.toLowerCase() === category.toLowerCase(),
  );
  return match?.category ?? category;
}

/** Berapa banyak booking + paket yang masih nunjuk ke layanan ini. */
export async function countServiceUsage(serviceId: string): Promise<number> {
  const [bookings, packageItems] = await Promise.all([
    prisma.booking.count({ where: { serviceId } }),
    prisma.packageItem.count({ where: { serviceId } }),
  ]);
  return bookings + packageItems;
}
