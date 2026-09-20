import { AuthShell } from "@/components/auth-shell";
import { GoogleAuthButton } from "@/components/google-auth-button";

// Satu halaman buat masuk sekaligus daftar: karena satu-satunya jalur adalah
// Google, "punya akun atau belum" ditentuin di /auth/callback (belum ada
// outlet → lanjut ke /onboarding), bukan sama user milih tab di sini.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthShell>
      <h1 className="text-center font-serif text-[1.4rem] font-medium leading-tight tracking-[-0.01em] text-ink md:text-[1.9rem]">
        Masuk atau daftar
      </h1>

      {/* /auth/callback nge-redirect ke sini bawa ?error=auth kalau tukar
          code OAuth-nya gagal. */}
      {error === "auth" && (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-danger-line bg-danger-soft px-4 py-3 text-center text-sm leading-relaxed text-danger-strong"
        >
          Login lewat Google belum berhasil. Coba sekali lagi ya.
        </p>
      )}

      <div className="mt-6 md:mt-8">
        <GoogleAuthButton />
      </div>
    </AuthShell>
  );
}