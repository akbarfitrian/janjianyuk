"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { LogoMarkStacked } from "@/components/logo";

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
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <LogoMarkStacked className="h-20 w-auto" />
        </Link>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Daftarkan outlet
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Sudah punya akun?{" "}
          <Link href="/login" className="underline underline-offset-4">
            Masuk
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="outletName" className="block text-sm font-medium text-neutral-900">
              Nama klinik/salon
            </label>
            <input
              id="outletName"
              required
              value={form.outletName}
              onChange={update("outletName")}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="ownerName" className="block text-sm font-medium text-neutral-900">
              Nama kamu
            </label>
            <input
              id="ownerName"
              required
              value={form.ownerName}
              onChange={update("ownerName")}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="ownerEmail" className="block text-sm font-medium text-neutral-900">
              Email
            </label>
            <input
              id="ownerEmail"
              type="email"
              required
              value={form.ownerEmail}
              onChange={update("ownerEmail")}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="ownerPhone" className="block text-sm font-medium text-neutral-900">
              No. WhatsApp
            </label>
            <input
              id="ownerPhone"
              required
              placeholder="62812xxxxxxx"
              value={form.ownerPhone}
              onChange={update("ownerPhone")}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-900">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={update("password")}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {isSubmitting ? "Memproses..." : "Daftar & mulai trial"}
          </button>
        </form>
      </div>
    </main>
  );
}
