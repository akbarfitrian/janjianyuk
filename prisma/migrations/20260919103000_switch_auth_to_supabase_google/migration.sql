-- Ganti auth dari NextAuth (Credentials + Prisma Adapter) ke Supabase Auth
-- (Google OAuth). Kredensial & sesi sekarang sepenuhnya dikelola Supabase
-- lewat tabel auth.users bawaannya, jadi Account/Session/VerificationToken
-- di sini udah nggak dipakai lagi. Aman dijalankan karena belum ada user
-- asli yang perlu dipertahankan.

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_userId_fkey";

-- DropTable
DROP TABLE IF EXISTS "Account";

-- DropTable
DROP TABLE IF EXISTS "Session";

-- DropTable
DROP TABLE IF EXISTS "VerificationToken";

-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "password";
ALTER TABLE "User" DROP COLUMN IF EXISTS "emailVerified";
