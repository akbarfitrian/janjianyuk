import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Next.js dev server hot-reloads modules, yang tanpa ini bikin PrismaClient
// baru kebuat tiap reload dan gampang kehabisan koneksi DB. Simpan satu
// instance di globalThis pas development.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma 7 wajib pakai driver adapter di runtime (url di schema.prisma
// sudah tidak dipakai lagi). Pakai DATABASE_URL yang pooled (pgbouncer)
// karena ini yang dipakai aplikasi jalan, bukan buat migrate.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
