import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";
import { PLANS } from "@/lib/plan";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan — Janjianyuk",
  description:
    "Syarat dan ketentuan penggunaan layanan Janjianyuk untuk klinik kecantikan, salon, dan barbershop.",
};

// ---------------------------------------------------------------------------
// ISI DULU SEBELUM DIPUBLIKASIKAN — semua nilai yang cuma kamu yang tahu ada
// di blok ini. Kalau masih ada tanda [ ... ], halamannya belum siap tayang.
// ---------------------------------------------------------------------------
const OPERATOR = {
  nama: "Janjianyuk",
  alamat: "Cilacap, Jawa Tengah",
  email: "janjianyuk@gmail.com",
  kotaPengadilan: "Cilacap", // domisili Pengadilan Negeri untuk sengketa
};
const BERLAKU_SEJAK = "21 September 2026";

// Keputusan bisnis — ubah angkanya kalau kebijakanmu beda.
const TRIAL_HARI = 14; // samain dengan TRIAL_DAYS di app/api/onboarding/route.ts
const HARI_PENGHAPUSAN_DATA = 30; // batas waktu hapus data setelah akun ditutup
const HARI_PEMBERITAHUAN_PERUBAHAN = 7; // pemberitahuan sebelum perubahan berlaku
const BULAN_BATAS_TANGGUNG_JAWAB = 3; // plafon ganti rugi = biaya N bulan terakhir

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

function Section({
  no,
  title,
  children,
}: {
  no: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-xl font-medium text-ink">
        {no}. {title}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-muted">
        {children}
      </div>
    </section>
  );
}

function BulletList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-ink-faint">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function SyaratKetentuanPage() {
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
        <article className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
          <h1 className="font-serif text-3xl font-medium tracking-tight text-ink sm:text-4xl">
            Syarat &amp; Ketentuan
          </h1>
          <p className="mt-3 text-sm text-ink-subtle">
            Berlaku sejak {BERLAKU_SEJAK}
          </p>

          <Section no={1} title="Tentang Layanan dan Penerimaan Ketentuan">
            <p>
              Janjianyuk adalah aplikasi web untuk klinik kecantikan, salon,
              barbershop, dan usaha layanan sejenis (“Outlet”). Layanan
              mencakup halaman booking online, kalender per staff, pengelolaan
              pelanggan, layanan, dan paket/membership, pencatatan kasir, serta
              pengingat lewat WhatsApp (“Layanan”). Layanan disediakan oleh{" "}
              {OPERATOR.nama}, beralamat di {OPERATOR.alamat} (“Kami”).
            </p>
            <p>
              Dengan membuat akun atau menggunakan Layanan, Anda (pemilik atau
              pengelola Outlet, “Pengguna”) menyatakan telah membaca, memahami,
              dan menyetujui Syarat &amp; Ketentuan ini. Jika Anda mendaftar
              atas nama badan usaha, Anda menyatakan berwenang mengikat badan
              usaha tersebut. Jika tidak setuju, mohon jangan gunakan Layanan.
            </p>
            <p>
              “Pelanggan Outlet” adalah orang yang melakukan booking atau
              dicatat sebagai pelanggan di Outlet Anda. “Data Outlet” adalah
              seluruh data yang dimasukkan ke Layanan oleh Anda atau oleh
              Pelanggan Outlet.
            </p>
          </Section>

          <Section no={2} title="Akun">
            <BulletList
              items={[
                "Masuk ke Layanan dilakukan dengan akun Google. Kami tidak menyimpan kata sandi akun Google Anda.",
                "Anda harus berusia minimal 18 tahun atau cakap menurut hukum untuk membuat akun.",
                "Untuk saat ini, satu akun pemilik digunakan untuk satu Outlet.",
                "Anda wajib memberikan informasi yang benar (misalnya nama Outlet dan nomor WhatsApp pemilik) dan memperbaruinya bila berubah.",
                "Anda bertanggung jawab menjaga keamanan akun Google Anda dan atas semua aktivitas di akun Layanan Anda. Segera hubungi Kami jika menduga ada akses tanpa izin.",
              ]}
            />
          </Section>

          <Section no={3} title="Masa Percobaan, Paket Berbayar, dan Pembayaran">
            <BulletList
              items={[
                `Akun baru mendapat masa percobaan gratis ${TRIAL_HARI} hari tanpa kartu kredit. Setelah masa percobaan berakhir, menu dashboard dikunci (kecuali halaman Tagihan) sampai Anda berlangganan.`,
                `Paket berbayar saat ini adalah paket ${PLANS.pro.label} seharga ${formatRupiah(PLANS.pro.price)} per bulan, dengan periode langganan 30 hari sejak pembayaran berhasil.`,
                "Pembayaran diproses oleh penyedia pembayaran pihak ketiga dan tunduk pada ketentuan penyedia tersebut. Kami tidak menyimpan data kartu, rekening, atau dompet digital Anda.",
                "Jika pembayaran perpanjangan gagal atau tidak dilakukan, akses dashboard dikunci sampai pembayaran berhasil. Tidak ada masa tenggang tambahan kecuali Kami umumkan.",
                `Kami dapat mengubah harga atau isi paket dengan pemberitahuan minimal ${HARI_PEMBERITAHUAN_PERUBAHAN} hari sebelumnya. Perubahan tidak berlaku untuk periode yang sudah Anda bayar.`,
                "Harga dinyatakan dalam Rupiah; pajak, jika berlaku, dicantumkan saat pembayaran.",
                "Pembayaran yang sudah berhasil tidak dapat dikembalikan, kecuali terjadi kesalahan penagihan dari pihak Kami (misalnya tertagih ganda) atau bila hukum mewajibkan lain.",
              ]}
            />
          </Section>

          <Section no={4} title="Data Pelanggan dan Pelindungan Data Pribadi">
            <p>
              Layanan memproses data pribadi Pelanggan Outlet, misalnya nama,
              nomor HP, riwayat booking, dan catatan, yang dimasukkan oleh Anda
              atau oleh Pelanggan Outlet saat booking online. Berdasarkan
              Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi,
              Anda bertindak sebagai Pengendali Data Pribadi atas data
              tersebut, sedangkan Kami bertindak sebagai Prosesor Data Pribadi
              yang memprosesnya atas instruksi Anda untuk menyediakan Layanan.
            </p>
            <p className="font-medium text-ink">Kewajiban Anda:</p>
            <BulletList
              items={[
                "Memiliki dasar yang sah untuk memproses data Pelanggan Outlet, termasuk persetujuan mereka bila diperlukan, dan memberi tahu mereka bahwa datanya dipakai untuk pengelolaan booking dan pengiriman pesan WhatsApp.",
                "Memastikan Pelanggan Outlet bersedia menerima pesan WhatsApp dari Layanan. Layanan mengirim pesan konfirmasi saat booking dibuat dan pengingat H-1 untuk booking berstatus menunggu atau terkonfirmasi ke nomor yang tercatat.",
                "Mengisi catatan pelanggan (misalnya alergi, preferensi, atau catatan treatment) hanya seperlunya. Informasi kesehatan termasuk data pribadi yang bersifat spesifik dan memerlukan perlindungan lebih ketat, jadi pastikan Anda berhak dan punya dasar yang sah untuk mencatatnya.",
                "Menindaklanjuti permintaan Pelanggan Outlet terkait datanya (akses, perbaikan, atau penghapusan). Anda dapat mengubah dan menghapus data pelanggan langsung dari dashboard.",
              ]}
            />
            <p className="font-medium text-ink">Komitmen Kami:</p>
            <BulletList
              items={[
                "Memproses Data Outlet hanya untuk menyediakan, mengamankan, dan memperbaiki Layanan. Kami tidak menjual Data Outlet.",
                "Menerapkan langkah pengamanan teknis dan organisasi yang wajar untuk melindungi Data Outlet, termasuk memisahkan akses antar Outlet.",
                "Memakai penyedia pihak ketiga untuk hosting, basis data, autentikasi, pengiriman pesan WhatsApp, dan pembayaran. Penyedia tersebut dapat berada di luar Indonesia.",
                "Segera memberi tahu Anda bila terjadi kegagalan pelindungan data yang memengaruhi Data Outlet, agar Anda dapat memenuhi kewajiban pemberitahuan menurut hukum.",
              ]}
            />
            <p>
              Data akun Anda sendiri (nama, alamat email, dan foto profil dari
              akun Google, serta nomor WhatsApp pemilik yang Anda isi saat
              pendaftaran) Kami gunakan untuk menyediakan dan mengamankan akun
              serta menghubungi Anda terkait Layanan.
            </p>
          </Section>

          <Section no={5} title="Penggunaan yang Dilarang">
            <p>Anda tidak boleh:</p>
            <BulletList
              items={[
                "Menggunakan Layanan untuk melanggar hukum atau hak pihak lain.",
                "Memasukkan atau memproses data pribadi orang lain tanpa dasar yang sah, atau menggunakan fitur pesan untuk spam, penipuan, atau pelecehan.",
                "Mencoba mengakses akun, data, atau Outlet yang bukan milik Anda, atau menembus dan mengganggu keamanan Layanan.",
                "Membebani sistem secara tidak wajar (misalnya permintaan otomatis dalam jumlah besar) atau mengganggu pengguna lain.",
                "Membongkar, menyalin, atau merekayasa balik Layanan, serta menjual, menyewakan, atau memberikan akses Layanan kepada pihak lain tanpa izin tertulis dari Kami.",
              ]}
            />
          </Section>

          <Section no={6} title="Hubungan dengan Pelanggan Outlet, Kasir, dan Laporan">
            <BulletList
              items={[
                "Janjianyuk hanyalah alat bantu. Kami bukan pihak dalam hubungan antara Anda dan Pelanggan Outlet. Kualitas layanan, harga, jadwal, pembatalan, paket/membership, dan pengembalian dana kepada Pelanggan Outlet sepenuhnya menjadi tanggung jawab Anda.",
                "Fitur Kasir dan laporan hanya mencatat transaksi (tunai, QRIS, atau transfer) yang Anda masukkan. Kami tidak menerima, memproses, atau menyimpan uang pembayaran Pelanggan Outlet.",
                "Anda bertanggung jawab atas keakuratan pencatatan, pembukuan, dan kewajiban perpajakan Anda. Laporan di Layanan bukan nasihat akuntansi atau pajak.",
                "Anda bertanggung jawab menjaga jam operasional, layanan, dan data staff tetap akurat. Kami tidak bertanggung jawab atas bentrok jadwal yang timbul dari data yang tidak akurat.",
              ]}
            />
          </Section>

          <Section no={7} title="Kekayaan Intelektual dan Data Anda">
            <BulletList
              items={[
                "Layanan, termasuk perangkat lunak, desain, merek, dan logo Janjianyuk, adalah milik Kami atau pemberi lisensi Kami. Selama Anda berhak memakai Layanan, Kami memberi Anda lisensi terbatas, non-eksklusif, tidak dapat dialihkan, dan dapat dicabut untuk menggunakannya bagi kegiatan usaha Outlet Anda.",
                "Data Outlet tetap milik Anda atau Pelanggan Outlet. Anda memberi Kami izin terbatas untuk menyimpan dan memprosesnya seperlunya guna menyediakan Layanan.",
                "Jika Anda memberikan saran atau masukan tentang Layanan, Kami boleh menggunakannya tanpa kewajiban apa pun kepada Anda.",
              ]}
            />
          </Section>

          <Section no={8} title="Ketersediaan Layanan dan Batasan Tanggung Jawab">
            <BulletList
              items={[
                "Kami berupaya menjaga Layanan tetap tersedia, tetapi Layanan diberikan “sebagaimana adanya”. Kami tidak menjamin Layanan selalu bebas dari gangguan, kesalahan, atau kehilangan data, dan pemeliharaan dapat membuatnya sementara tidak tersedia. Simpanlah catatan penting Anda secara mandiri.",
                "Pengiriman pesan WhatsApp bergantung pada penyedia pesan pihak ketiga dan kebijakan WhatsApp. Kami tidak menjamin setiap pesan terkirim atau diterima, dan tidak bertanggung jawab atas pembatasan yang diterapkan WhatsApp atau penyedia pesan.",
                "Sejauh diizinkan hukum, Kami tidak bertanggung jawab atas kerugian tidak langsung, seperti hilangnya pendapatan, booking, atau reputasi, akibat penggunaan atau ketidakmampuan menggunakan Layanan.",
                `Sejauh diizinkan hukum, total tanggung jawab Kami kepada Anda atas seluruh klaim terkait Layanan dibatasi sebesar biaya yang Anda bayarkan kepada Kami dalam ${BULAN_BATAS_TANGGUNG_JAWAB} bulan terakhir sebelum klaim timbul. Batasan ini tidak berlaku bila hukum melarangnya, termasuk untuk kesengajaan atau kelalaian berat.`,
                "Kami tidak bertanggung jawab atas keterlambatan atau kegagalan yang disebabkan keadaan di luar kendali yang wajar, seperti bencana alam, gangguan listrik atau internet, gangguan penyedia infrastruktur, atau tindakan pemerintah.",
              ]}
            />
          </Section>

          <Section no={9} title="Penangguhan dan Penghentian">
            <BulletList
              items={[
                `Anda dapat berhenti kapan saja dengan berhenti memakai Layanan. Untuk menutup akun dan meminta penghapusan Data Outlet, hubungi ${OPERATOR.email}.`,
                "Kami dapat menangguhkan atau menghentikan akses Anda bila Anda melanggar Ketentuan ini, penggunaan Anda membahayakan Layanan atau pihak lain, hukum mewajibkannya, atau pembayaran tidak dilakukan.",
                `Setelah akun ditutup, baik atas permintaan Anda maupun karena Kami menghentikannya, Kami akan menghapus atau menganonimkan Data Outlet paling lambat ${HARI_PENGHAPUSAN_DATA} hari sejak permintaan atau penghentian tersebut, kecuali data yang wajib Kami simpan menurut hukum (misalnya catatan pembayaran langganan).`,
                "Bagian yang menurut sifatnya tetap berlaku setelah penghentian (kekayaan intelektual, batasan tanggung jawab, dan penyelesaian sengketa) tetap berlaku.",
              ]}
            />
          </Section>

          <Section no={10} title="Perubahan Ketentuan">
            <p>
              Kami dapat memperbarui Syarat &amp; Ketentuan ini dari waktu ke
              waktu. Perubahan penting akan diberitahukan lewat Layanan atau
              email minimal {HARI_PEMBERITAHUAN_PERUBAHAN} hari sebelum
              berlaku. Jika Anda terus menggunakan Layanan setelah perubahan
              berlaku, Anda dianggap menyetujuinya. Jika tidak setuju, hentikan
              penggunaan Layanan. Versi terbaru selalu tersedia di halaman ini
              beserta tanggal berlakunya.
            </p>
          </Section>

          <Section no={11} title="Hukum yang Berlaku dan Penyelesaian Sengketa">
            <p>
              Ketentuan ini diatur oleh hukum Republik Indonesia. Sengketa yang
              timbul akan diselesaikan terlebih dahulu secara musyawarah untuk
              mufakat. Jika tidak tercapai dalam 30 hari, sengketa diselesaikan
              melalui Pengadilan Negeri {OPERATOR.kotaPengadilan}.
            </p>
          </Section>

          <Section no={12} title="Ketentuan Lain">
            <p>
              Jika salah satu bagian dari Ketentuan ini dinyatakan tidak sah,
              bagian lainnya tetap berlaku. Kegagalan Kami menegakkan suatu hak
              bukan berarti Kami melepaskan hak tersebut. Anda tidak boleh
              mengalihkan hak atau kewajiban Anda tanpa persetujuan tertulis
              dari Kami. Ketentuan ini merupakan keseluruhan kesepakatan antara
              Anda dan Kami terkait Layanan.
            </p>
          </Section>

          <Section no={13} title="Kontak">
            <p>
              Pertanyaan tentang Syarat &amp; Ketentuan ini dapat disampaikan
              kepada {OPERATOR.nama}, {OPERATOR.alamat}, atau lewat email{" "}
              {OPERATOR.email}.
            </p>
          </Section>
        </article>
      </main>
    </>
  );
}
