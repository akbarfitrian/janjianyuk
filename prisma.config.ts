import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 memindahkan connection URL dari schema.prisma ke sini.
// CLI (generate, migrate, studio) pakai DIRECT_URL (non-pooled) karena
// `prisma migrate` butuh koneksi langsung, bukan lewat pgbouncer.
// Client runtime aplikasi (lib/prisma.ts) tetap pakai DATABASE_URL (pooled)
// lewat driver adapter — lihat lib/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
