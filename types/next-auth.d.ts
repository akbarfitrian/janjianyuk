import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      outletId: string | null;
      outletSlug: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    outletId: string | null;
    outletSlug: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    outletId?: string | null;
    outletSlug?: string | null;
  }
}
