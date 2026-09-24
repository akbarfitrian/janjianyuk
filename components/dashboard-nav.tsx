"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { LogoMark } from "@/components/logo";
import { formatPlanLine } from "@/lib/plan";
import { createClient } from "@/lib/supabase/client";

function OverviewIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function BookingIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function CustomersIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.5 20v-1a5.5 5.5 0 0 1 11 0v1" />
      <path d="M16.5 8.5a3 3 0 0 1 0 5.75" />
      <path d="M18.5 20v-1a5 5 0 0 0-3-4.58" />
    </svg>
  );
}

function ServicesIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <path d="M8.12 8.12 12 12" />
      <path d="M20 4 8.12 15.88" />
      <circle cx="6" cy="18" r="3" />
      <path d="M14.8 14.8 20 20" />
    </svg>
  );
}

function PackagesIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
    </svg>
  );
}

function CashierIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <circle cx="17" cy="14.5" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

function StaffIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a8 8 0 0 1 16 0v1" />
    </svg>
  );
}

function BillingIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2h9l3 3v17H6Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  );
}

function ClockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

function HolidayIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="9.5" y1="13.5" x2="14.5" y2="18.5" />
      <line x1="14.5" y1="13.5" x2="9.5" y2="18.5" />
    </svg>
  );
}

const navItems = [
  { href: "", label: "Ringkasan", icon: OverviewIcon },
  { href: "/bookings", label: "Booking", icon: BookingIcon },
  { href: "/customers", label: "Pelanggan", icon: CustomersIcon },
  { href: "/services", label: "Layanan", icon: ServicesIcon },
  { href: "/packages", label: "Paket", icon: PackagesIcon },
  { href: "/kasir", label: "Kasir", icon: CashierIcon },
  { href: "/staff", label: "Staff", icon: StaffIcon },
  { href: "/settings/hours", label: "Jam Operasional", icon: ClockIcon },
  { href: "/settings/schedule", label: "Libur & Cuti", icon: HolidayIcon },
  { href: "/settings/billing", label: "Tagihan", icon: BillingIcon },
];

function MenuIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

function MoreIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

function LogoutIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function OutletBrand({
  outletName,
  planName,
  planStatus,
}: {
  outletName: string;
  planName: string;
  planStatus: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <LogoMark className="h-6 w-6 shrink-0" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">
          {outletName}
        </p>
        <p className="truncate text-xs text-ink-subtle">
          {formatPlanLine(planName, planStatus)}
        </p>
      </div>
    </div>
  );
}

function NavLinks({ outletSlug }: { outletSlug: string }) {
  const pathname = usePathname();

  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const href = `/${outletSlug}${item.href}`;
        // Ringkasan (href kosong) harus persis sama, kalau nggak dia bakal
        // aktif di semua halaman. Menu lain tetap aktif pas di sub-halamannya.
        const active =
          item.href === ""
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={item.href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-surface-2 font-medium text-ink"
                : "text-ink-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${active ? "text-accent" : ""}`} />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

function UserMenu({
  userName,
  userEmail,
}: {
  userName?: string | null;
  userEmail?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const displayName = userName?.trim() || userEmail || "Pengguna";
  const initial = (userName?.trim() || userEmail || "?").charAt(0).toUpperCase();

  // Tutup popover kalau klik di luar area menu.
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-full rounded-lg border border-line bg-surface p-3 shadow-lg">
          <p className="truncate text-xs text-ink-subtle">{userEmail}</p>
          <button
            type="button"
            disabled={loggingOut}
            onClick={async () => {
              setLoggingOut(true);
              const supabase = createClient();
              await supabase.auth.signOut();
              // router.refresh() bikin server component ke-render ulang
              // dengan session terbaru (udah kosong), jadi layout dashboard
              // langsung redirect ke /login lewat getCurrentUser().
              router.push("/login");
              router.refresh();
            }}
            className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-danger hover:bg-danger-soft disabled:opacity-60"
          >
            <LogoutIcon className="h-4 w-4" />
            {loggingOut ? "Keluar…" : "Keluar"}
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-surface-2"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-on-accent">
          {initial}
        </span>
        <span
          className={`min-w-0 flex-1 truncate text-sm font-medium text-ink ${
            userName?.trim() ? "capitalize" : ""
          }`}
        >
          {displayName}
        </span>
        <MoreIcon className="h-4 w-4 shrink-0 text-ink-faint" />
      </button>
    </div>
  );
}

export function DashboardNav({
  outletSlug,
  outletName,
  planName,
  planStatus,
  userName,
  userEmail,
}: {
  outletSlug: string;
  outletName: string;
  planName: string;
  planStatus: string;
  userName?: string | null;
  userEmail?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Tutup drawer otomatis tiap kali pindah halaman.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Kunci scroll body selagi drawer kebuka biar kontennya nggak ikut geser.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  return (
    <>
      {/* Topbar mobile */}
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          className="-ml-2 rounded-md p-2 text-ink-muted hover:bg-surface-2"
        >
          <MenuIcon />
        </button>
        <Link href={`/${outletSlug}`} className="flex min-w-0 items-center gap-2">
          <LogoMark className="h-6 w-6 shrink-0" />
          <span className="truncate text-sm font-semibold text-ink">
            {outletName}
          </span>
        </Link>
        <div className="w-9 shrink-0" aria-hidden="true" />
      </div>

      {/* Sidebar desktop */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-56 md:shrink-0 md:flex-col md:overflow-y-auto md:border-r md:border-line md:bg-surface md:px-4 md:py-6">
        <OutletBrand outletName={outletName} planName={planName} planStatus={planStatus} />
        <nav className="mt-6 flex flex-col gap-1">
          <NavLinks outletSlug={outletSlug} />
        </nav>
        <div className="mt-auto border-t border-line pt-4">
          <UserMenu userName={userName} userEmail={userEmail} />
        </div>
      </aside>

      {/* Drawer mobile (slide-in dari kiri) */}
      <div className={`fixed inset-0 z-40 md:hidden ${open ? "" : "pointer-events-none"}`}>
        <div
          onClick={() => setOpen(false)}
          aria-hidden="true"
          className={`absolute inset-0 bg-canvas/70 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[80%] flex-col bg-surface px-4 py-6 shadow-xl transition-transform duration-200 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <OutletBrand outletName={outletName} planName={planName} planStatus={planStatus} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup menu"
              className="shrink-0 rounded-md p-2 text-ink-subtle hover:bg-surface-2"
            >
              <CloseIcon />
            </button>
          </div>

          <nav className="mt-6 flex flex-col gap-1">
            <NavLinks outletSlug={outletSlug} />
          </nav>

          <div className="mt-auto border-t border-line pt-4">
            <UserMenu userName={userName} userEmail={userEmail} />
          </div>
        </div>
      </div>
    </>
  );
}
