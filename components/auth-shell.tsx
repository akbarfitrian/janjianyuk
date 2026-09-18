import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/logo";
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
      aria-label="Janjianyuk"
      className={`flex items-center justify-center gap-3 ${className}`}
    >
      <LogoMark className="h-11 w-11" />
      <span className="text-[1.75rem] font-semibold tracking-[-0.02em] text-ink">
        janjianyuk
      </span>
    </Link>
  );
}

function TabLink({
  href,
  isActive,
  children,
}: {
  href: string;
  isActive: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
        isActive
          ? "bg-accent text-on-accent"
          : "text-ink-subtle hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

export function AuthShell({
  active,
  children,
}: {
  active: "login" | "register";
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-8 sm:px-6 sm:py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[28px] border border-line shadow-[0_50px_100px_-30px_rgba(0,0,0,0.8)] md:grid-cols-[1fr_1.05fr]">
        {/* Brand panel — desktop only */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-surface-2 px-10 py-12 md:flex">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-accent/[0.18] blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-azure/[0.14] blur-3xl"
          />
          <BrandLockup className="relative" />

          <div className="relative mt-10 flex flex-1 flex-col">
            <AuthSlides />
          </div>
        </div>

        {/* Brand strip — mobile only */}
        <div className="flex items-center justify-center bg-surface-2 px-6 py-6 md:hidden">
          <BrandLockup />
        </div>

        {/* Form panel */}
        <div className="flex flex-col bg-surface px-6 py-8 sm:px-10 sm:py-12">
          <div className="mb-8 inline-flex w-fit rounded-full border border-line bg-surface-2 p-1">
            <TabLink href="/login" isActive={active === "login"}>
              Masuk
            </TabLink>
            <TabLink href="/register" isActive={active === "register"}>
              Daftar
            </TabLink>
          </div>

          {children}
        </div>
      </div>
    </main>
  );
}
