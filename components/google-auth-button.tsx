"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { errorTextClass } from "@/components/auth-shell";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44c-.28 1.48-1.13 2.73-2.4 3.58v2.98h3.88c2.27-2.09 3.57-5.17 3.57-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.92l-3.88-2.98c-1.08.72-2.45 1.15-4.05 1.15-3.11 0-5.75-2.1-6.69-4.93H1.3v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.31 14.32c-.24-.72-.38-1.49-.38-2.32s.14-1.6.38-2.32V6.59H1.3A11.97 11.97 0 0 0 0 12c0 1.93.46 3.76 1.3 5.41l4.01-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.3 6.59l4.01 3.09c.94-2.83 3.58-4.93 6.69-4.93z"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
      className="animate-spin motion-reduce:animate-none"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GoogleAuthButton({
  label = "Lanjut dengan Google",
}: {
  label?: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kalau user pencet Back dari halaman Google, browser sering ngembaliin
  // halaman ini dari bfcache dengan state persis kayak pas ditinggal —
  // tombolnya masih "Menghubungkan..." dan disabled selamanya. Reset di sini.
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) setIsSubmitting(false);
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  async function handleClick() {
    setError(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setIsSubmitting(false);
      setError("Gagal menghubungkan ke Google. Coba lagi.");
    }
    // Kalau sukses, browser langsung diarahkan ke Google — nggak perlu
    // reset isSubmitting karena halaman ini bakal ditinggalkan.
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-xl border border-line-strong bg-surface-2 px-4 py-3 text-[15px] font-semibold tracking-tight text-ink transition-all hover:border-accent-line hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? <Spinner /> : <GoogleIcon />}
        {isSubmitting ? "Menghubungkan ke Google..." : label}
      </button>
      {error && (
        <p role="alert" className={`${errorTextClass} text-center`}>
          {error}
        </p>
      )}
    </div>
  );
}