import Link from "next/link";
import type { ReactNode } from "react";
import { AuthSlides } from "@/components/auth-slides";

export const fieldLabelClass =
  "mb-2 block text-[11px] font-medium uppercase tracking-[0.09em] text-ink-faint";

export const fieldClass =
  "w-full rounded-xl border border-line-strong bg-surface-2 px-4 py-2.5 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-azure focus:bg-surface";

export const primaryButtonClass =
  "w-full rounded-xl bg-accent px-4 py-3 text-[15px] font-semibold tracking-tight text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50";

export const errorTextClass = "text-sm text-danger";

function BrandLockup({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="JanjianYuk"
      className={`flex items-center justify-center ${className}`}
    >
      <span className="font-serif text-[2.25rem] font-semibold italic tracking-[-0.02em] text-ink md:text-[3.25rem]">
    JanjianYuk
      </span>
    </Link>
  );
}

/**
 * Kartu di tengah layar, dua bagian: panel brand (logo + slide) dan panel
 * form. Di mobile keduanya numpuk vertikal (brand di atas, form di bawah);
 * di desktop (md+) jadi dua kolom. Panel brand cuma satu instance yang sama
 * di semua ukuran layar — beda tampilannya diatur lewat class responsif, jadi
 * timer slide nggak jalan dobel.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-8 sm:px-6 sm:py-10">
      <div className="grid w-full max-w-md overflow-hidden rounded-[28px] border border-line shadow-[0_50px_100px_-30px_rgba(0,0,0,0.8)] md:max-w-4xl md:grid-cols-[1fr_1.05fr]">
        {/* Panel brand */}
        <div className="relative flex flex-col overflow-hidden bg-surface-2 px-6 py-9 md:justify-between md:px-10 md:py-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-accent/[0.18] blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-azure/[0.14] blur-3xl"
          />
          <BrandLockup className="relative" />

          <div className="relative mt-4 flex flex-1 flex-col md:mt-10">
            <AuthSlides />
          </div>
        </div>

        {/* Panel form — konten dipusatkan vertikal. */}
        <div className="flex flex-col justify-center bg-surface px-6 py-8 sm:px-10 md:py-12">
          <div className="mx-auto w-full max-w-sm">{children}</div>
        </div>
      </div>
    </main>
  );
}