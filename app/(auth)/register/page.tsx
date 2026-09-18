"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  AuthShell,
  errorTextClass,
  fieldClass,
  fieldLabelClass,
  primaryButtonClass,
} from "@/components/auth-shell";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    outletName: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setIsSubmitting(false);
      setError(data.error ?? "Gagal mendaftar. Coba lagi.");
      return;
    }

    const result = await signIn("credentials", {
      email: form.ownerEmail,
      password: form.password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      // Akun kebuat tapi auto-login gagal — arahkan ke login manual.
      router.push("/login");
      return;
    }

    router.push(`/${data.outletSlug}`);
    router.refresh();
  }

  return (
    <AuthShell active="register">
      <div className="mb-7">
        <h1 className="font-serif text-[1.9rem] font-medium leading-tight tracking-[-0.01em] text-ink">
          Buat akun outlet
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-subtle">
          Trial 14 hari, tanpa kartu kredit.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="outletName" className={fieldLabelClass}>
            Nama klinik/salon
          </label>
          <input
            id="outletName"
            required
            value={form.outletName}
            onChange={update("outletName")}
            className={fieldClass}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ownerName" className={fieldLabelClass}>
              Nama kamu
            </label>
            <input
              id="ownerName"
              required
              value={form.ownerName}
              onChange={update("ownerName")}
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="ownerPhone" className={fieldLabelClass}>
              No. WhatsApp
            </label>
            <input
              id="ownerPhone"
              required
              placeholder="62812xxxxxxx"
              value={form.ownerPhone}
              onChange={update("ownerPhone")}
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="ownerEmail" className={fieldLabelClass}>
            Email
          </label>
          <input
            id="ownerEmail"
            type="email"
            required
            autoComplete="email"
            value={form.ownerEmail}
            onChange={update("ownerEmail")}
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
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={update("password")}
            className={fieldClass}
          />
        </div>

        {error && <p className={errorTextClass}>{error}</p>}

        <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
          {isSubmitting ? "Memproses..." : "Daftar & mulai trial"}
        </button>
      </form>
    </AuthShell>
  );
}
