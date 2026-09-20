import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { LogoMark } from "@/components/logo";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  // getCurrentUser() balik null kalau belum login SAMA kalau baris User-nya
  // di Prisma belum ada (login Google pertama kali) — bedain dua kasus itu
  // langsung dari Supabase Auth di sini.
  if (!user) {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      redirect("/login");
    }

    return (
      <OnboardingShell
        name={
          (authUser.user_metadata?.full_name as string | undefined) ??
          (authUser.user_metadata?.name as string | undefined) ??
          null
        }
        email={authUser.email ?? null}
      />
    );
  }

  if (user.outletSlug) {
    redirect(`/${user.outletSlug}`);
  }

  return <OnboardingShell name={user.name} email={user.email} />;
}

function OnboardingShell({
  name,
  email,
}: {
  name: string | null;
  email: string | null;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-line bg-surface px-6 py-8 shadow-[0_50px_100px_-30px_rgba(0,0,0,0.8)] sm:px-10 sm:py-12">
        <LogoMark className="h-10 w-10" />
        <h1 className="mt-6 font-serif text-[1.75rem] font-medium leading-tight tracking-[-0.01em] text-ink">
          Lengkapi data outlet
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-subtle">
          Satu langkah lagi — ini yang bakal dipakai buat halaman booking
          online kamu. Trial 14 hari otomatis mulai begitu selesai.
        </p>
        <OnboardingForm defaultName={name} defaultEmail={email} />
      </div>
    </main>
  );
}
