import { AuthShell } from "@/components/auth-shell";
import { GoogleAuthButton } from "@/components/google-auth-button";

export default function RegisterPage() {
  return (
    <AuthShell active="register">
      <div className="mb-7">
        <h1 className="font-serif text-[1.9rem] font-medium leading-tight tracking-[-0.01em] text-ink">
          Buat akun outlet
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-subtle">
          Trial 14 hari, tanpa kartu kredit. Daftar pakai akun Google, terus
          lengkapi data outlet kamu.
        </p>
      </div>

      <GoogleAuthButton label="Daftar dengan Google" />
    </AuthShell>
  );
}
