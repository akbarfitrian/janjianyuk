import Link from "next/link";
import { Logo } from "@/components/logo";

export default function MarketingHomePage() {
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo />
          <Link
            href="/login"
            className="text-sm font-medium text-azure underline underline-offset-4 transition-colors hover:text-azure-hover"
          >
            Masuk
          </Link>
        </div>
      </header>

      <main className="flex-1">
      <section className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
        <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Booking klinik & salon, bukan lewat chat yang kebanjiran.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-muted">
          Pelanggan booking sendiri lewat halaman online, jadwal per staff
          otomatis ke-block kalau penuh, dan reminder H-1 terkirim sendiri
          lewat WhatsApp — tanpa admin harus balas satu-satu.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Link
            href="/login"
            className="rounded-md bg-accent px-5 py-3 text-sm font-medium text-on-accent hover:bg-accent-hover"
          >
            Coba gratis
          </Link>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <dl className="grid gap-10 sm:grid-cols-3">
            <div>
              <dt className="font-medium text-ink">
                Halaman booking sendiri
              </dt>
              <dd className="mt-2 text-sm text-ink-muted">
                Link yang bisa ditaruh di bio Instagram atau WA, pelanggan
                pilih layanan dan jam kosong sendiri.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-ink">
                Jadwal per staff
              </dt>
              <dd className="mt-2 text-sm text-ink-muted">
                Slot yang udah kepakai otomatis ketutup, gak ada lagi dua
                pelanggan dobel di jam yang sama.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-ink">
                Reminder otomatis
              </dt>
              <dd className="mt-2 text-sm text-ink-muted">
                Konfirmasi booking dan reminder H-1 terkirim sendiri ke WA
                pelanggan.
              </dd>
            </div>
          </dl>
        </div>
      </section>
      </main>
    </>
  );
}
