"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  errorTextClass,
  fieldClass,
  fieldLabelClass,
  primaryButtonClass,
} from "@/components/auth-shell";

export function OnboardingForm({
  defaultName,
  defaultEmail,
}: {
  defaultName: string | null;
  defaultEmail: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ outletName: "", ownerPhone: "" });
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

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setIsSubmitting(false);
      setError(data.error ?? "Gagal menyimpan. Coba lagi.");
      return;
    }

    router.push(`/${data.outletSlug}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <p className="truncate text-[13px] text-ink-subtle">
        Masuk sebagai{" "}
        <span className="font-medium text-ink">
          {defaultName?.trim() || defaultEmail || "akun Google kamu"}
        </span>
      </p>

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

      {error && <p className={errorTextClass}>{error}</p>}

      <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
        {isSubmitting ? "Menyimpan..." : "Selesai & masuk dashboard"}
      </button>
    </form>
  );
}
