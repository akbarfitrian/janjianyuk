import Link from "next/link";

export default function MarketingHomePage() {
  return (
    <main className="flex-1">
      <section className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
          Booking klinik & salon, bukan lewat chat yang kebanjiran.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-neutral-600">
          Pelanggan booking sendiri lewat halaman online, jadwal per staff
          otomatis ke-block kalau penuh, dan reminder H-1 terkirim sendiri
          lewat WhatsApp — tanpa admin harus balas satu-satu.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Link
            href="/register"
            className="rounded-md bg-neutral-900 px-5 py-3 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Coba gratis
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-neutral-900 underline underline-offset-4"
          >
            Sudah punya akun? Masuk
          </Link>
        </div>
      </section>

      <section className="border-t border-neutral-200">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <dl className="grid gap-10 sm:grid-cols-3">
            <div>
              <dt className="font-medium text-neutral-900">
                Halaman booking sendiri
              </dt>
              <dd className="mt-2 text-sm text-neutral-600">
                Link yang bisa ditaruh di bio Instagram atau WA, pelanggan
                pilih layanan dan jam kosong sendiri.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-neutral-900">
                Jadwal per staff
              </dt>
              <dd className="mt-2 text-sm text-neutral-600">
                Slot yang udah kepakai otomatis ketutup, gak ada lagi dua
                pelanggan dobel di jam yang sama.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-neutral-900">
                Reminder otomatis
              </dt>
              <dd className="mt-2 text-sm text-neutral-600">
                Konfirmasi booking dan reminder H-1 terkirim sendiri ke WA
                pelanggan.
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
