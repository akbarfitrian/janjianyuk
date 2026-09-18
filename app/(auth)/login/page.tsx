"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import {
  AuthShell,
  errorTextClass,
  fieldClass,
  fieldLabelClass,
  primaryButtonClass,
} from "@/components/auth-shell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setIsSubmitting(false);
      setError("Email atau password salah.");
      return;
    }

    // signIn({redirect:false}) nggak balikin data user langsung — ambil
    // session yang baru kebentuk buat tau outletSlug-nya, terus redirect
    // ke dashboard outlet itu (bukan ke landing page).
    const session = await getSession();
    setIsSubmitting(false);

    if (!session?.user?.outletSlug) {
      setError("Akun ini belum terhubung ke outlet manapun.");
      return;
    }

    router.push(`/${session.user.outletSlug}`);
    router.refresh();
  }

  return (
    <AuthShell active="login">
      <div className="mb-8">
        <h1 className="font-serif text-[1.9rem] font-medium leading-tight tracking-[-0.01em] text-ink">
          Selamat datang kembali
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-subtle">
          Masuk ke dashboard outlet kamu.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className={fieldLabelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="password" className={fieldLabelClass}>
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClass}
          />
        </div>

        {error && <p className={errorTextClass}>{error}</p>}

        <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
          {isSubmitting ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </AuthShell>
  );
}
