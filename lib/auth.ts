import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

// Catatan: sengaja belum pasang @auth/prisma-adapter di sini. Adapter itu
// buat provider OAuth (Google dkk) yang butuh Account/Session tersimpan di
// DB — tabelnya (User, Account, Session, VerificationToken) udah ada di
// schema.prisma buat jaga-jaga, tapi selama cuma pakai Credentials, sesi
// cukup lewat JWT dan verifikasi password dilakukan manual di bawah.
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { outlet: { select: { slug: true } } },
        });
        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          outletId: user.outletId,
          outletSlug: user.outlet?.slug ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // `user` cuma ada pas baru login; simpan role & outletId ke token
      // supaya kepersist di sesi tanpa query ulang ke DB tiap request.
      if (user) {
        token.role = user.role;
        token.outletId = user.outletId;
        token.outletSlug = user.outletSlug;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
        session.user.outletId = token.outletId as string | null;
        session.user.outletSlug = token.outletSlug as string | null;
      }
      return session;
    },
  },
});
