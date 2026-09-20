# Janjianyuk

SaaS booking & appointment management buat klinik kecantikan, salon, dan barbershop. Next.js (App Router) + Prisma + PostgreSQL (Supabase) + Supabase Auth (Google OAuth).

## Status: Fase 4 — Lapisan Multi-Tenant SaaS (Billing)

Yang udah jadi di fase ini (nambahin ke Fase 0-3 yang udah ada):

- **Signup self-service** (lewat `/login`, satu halaman buat masuk dan daftar) dan **trial 14 hari** udah ada dari Fase 0 (`app/api/onboarding`, `Outlet.trialEndsAt`) — Fase 4 nambahin **penegakan**-nya: `lib/plan.ts#getEffectiveAccess` ngitung status akses (`ok` / `trial_expiring` / `locked`) on-the-fly dari `trialEndsAt` + `planStatus`, nggak butuh cron buat "nge-expire" trial.
- Dashboard layout (`app/(dashboard)/[outletSlug]/layout.tsx`) + `components/access-gate.tsx`: kalau akses `locked` (trial habis, atau `planStatus` `past_due`/`cancelled`), semua menu dashboard diganti tampilan "Akses dikunci" KECUALI halaman **Billing** sendiri — owner tetap bisa masuk buat bayar. Sisa 3 hari trial, muncul banner peringatan (nggak ngunci apa pun).
- Menu **Billing** (`settings/billing`) — status paket & tanggal trial berakhir, tombol **Upgrade ke Pro** yang bikin `Subscription` baru (status `pending`) lalu redirect ke halaman pembayaran hosted gateway, dan riwayat transaksi (5 terakhir).
- `lib/payment.ts` — implementasi penuh dua provider (switch lewat `PAYMENT_GATEWAY_PROVIDER`, pola sama kayak `lib/wa-gateway.ts`):
  - **Midtrans**: Snap API (`/snap/v1/transactions`) → `redirect_url`.
  - **Xendit**: Invoice API (`/v2/invoices`) → `invoice_url`.
- `app/api/billing/upgrade` — endpoint owner-only yang bikin `Subscription` pending + manggil `createSubscriptionCharge`, nyimpen `gatewayRef` (order_id/external_id) buat dicocokin webhook nanti.
- Webhook `app/api/webhooks/midtrans` (verifikasi signature SHA512) dan `app/api/webhooks/xendit` (verifikasi header `x-callback-token`) — keduanya manggil `lib/subscription.ts#applySubscriptionOutcome` yang update `Subscription.status` + `Outlet.planStatus`/`planName` sesuai hasil (`paid` → `active`, `failed` pas renewal → `past_due`).

**Keputusan yang diambil di luar draft awal:**
- Tiap klik "Upgrade" bikin row `Subscription` baru (bukan update yang lama) — riwayat percobaan bayar yang gagal tetap kesimpen, dan tiap percobaan punya `gatewayRef` unik sendiri buat dicocokin webhook.
- Halaman booking publik (`/booking/[slug]`) **belum** ikut dikunci kalau outlet-nya `locked` — keputusan bisnis soal itu (matiin booking publik juga atau nggak) sengaja belum diambil di sini, tinggal tambahin cek `getEffectiveAccess` yang sama di `app/booking/[outletSlug]/page.tsx` kalau mau.
- `past_due` langsung dikunci tanpa masa tenggang tambahan — kalau mau kasih grace period (mis. 3 hari sebelum dikunci), tinggal ubah logikanya di `lib/plan.ts`.
- Harga paket Pro (`lib/plan.ts#PLANS`) di-hardcode di kode, bukan di database — cukup buat satu paket berbayar; kalau nanti nambah tier lain, pertimbangkan pindahin ke tabel `Plan` sendiri.

### Fase 3 — Paket/Membership + Kasir

Yang udah jadi di fase ini (nambahin ke Fase 0-2 yang udah ada):

- Menu **Paket** — CRUD `Package` (paket treatment, misal "5x Facial" nempel ke satu `Service`), plus "Jual paket ke pelanggan" yang bikin `CustomerPackage`
- Tracking sisa sesi tiap `CustomerPackage` langsung di menu Paket — tombol "Pakai sesi" (+1, nge-cek belum kedaluwarsa & belum habis) dan "Batal pakai" (-1, buat koreksi salah klik)
- Menu **Kasir** — daftar booking per tanggal dengan status bayar (Lunas/Belum bayar), tombol "Catat pembayaran" yang langsung bikin `Transaction` berstatus `"paid"`
- Laporan pendapatan harian/bulanan di bagian bawah menu Kasir — pilih bulan, lihat total & rincian per hari, sumbernya dari `Transaction` yang statusnya `"paid"`
- Overview dashboard sekarang pakai `Transaction` beneran buat "Pendapatan bulan ini" (sebelumnya di Fase 1 masih estimasi dari harga layanan booking `"completed"`)
- `app/api/reports/monthly` — endpoint agregasi laporan (grouping per hari dihitung di JS, bukan raw SQL, konsisten sama cara Overview page Fase 1 ngitung agregat)

**Keputusan yang diambil di luar draft awal:**
- `Transaction.bookingId` itu wajib diisi di schema, jadi penjualan paket (`CustomerPackage`) **belum otomatis** kecatat sebagai `Transaction` — dia nggak nempel ke satu booking tertentu. Kalau outlet-nya mau pendapatan dari jual paket ikut ke laporan, admin perlu catat pembayarannya manual lewat menu Kasir (nempelin ke booking apa pun) sampai skema `Transaction` diubah biar bisa berdiri sendiri dari booking.
- Paket dengan `CustomerPackage` yang udah pernah dibeli nggak bisa dihapus (biar histori pemakaian sesi pelanggan nggak ikut ilang) — cuma bisa diedit.

## Setup lokal

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Buat project Supabase**
   - Buka [supabase.com](https://supabase.com) → New Project
   - Setelah kebuat, ke **Project Settings → Database** → salin dua connection string:
     - **Connection pooling** (port 6543) → jadi `DATABASE_URL`
     - **Direct connection** (port 5432) → jadi `DIRECT_URL`

3. **Aktifin Google OAuth di Supabase**
   - Di [Google Cloud Console](https://console.cloud.google.com) → buat OAuth client ID tipe "Web application", authorized redirect URI: `https://[PROJECT-REF].supabase.co/auth/v1/callback`
   - Di dashboard Supabase → **Authentication → Providers → Google** → aktifin, isi Client ID & Client Secret dari langkah di atas
   - Masih di **Authentication → URL Configuration** → tambahin `http://localhost:3000/auth/callback` ke Redirect URLs

4. **Isi environment variables**
   ```bash
   cp .env.example .env
   ```
   Isi `DATABASE_URL` dan `DIRECT_URL` dari langkah 2, `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` dari **Project Settings → API**. Isi juga `WA_GATEWAY_TOKEN` (token Fonnte/Wablas), `CRON_SECRET` (string acak bebas), dan `PAYMENT_GATEWAY_SECRET_KEY` (Server Key Midtrans atau Secret Key Xendit, mode sandbox dulu buat development) — semuanya udah dipakai mulai fase ini. Kalau pakai Xendit, isi juga `PAYMENT_GATEWAY_CALLBACK_TOKEN` biar webhook-nya bisa diverifikasi.

5. **Push schema ke database**
   ```bash
   npx prisma migrate deploy
   ```
   (Bukan `db push` lagi — ada migration baru yang drop tabel Account/Session/VerificationToken peninggalan NextAuth. Kalau database dev kamu masih punya migration history dari sebelumnya, `migrate deploy` bakal jalanin migration yang belum keaplikasi termasuk yang baru ini.)

6. **Jalankan dev server**
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000` → daftar outlet baru lewat `/login` (tombol "Lanjut dengan Google").

> **Catatan:** langkah 1 dan 5 butuh akses internet ke `registry.npmjs.org` dan `binaries.prisma.sh` buat download Prisma engine. Kalau kamu jalanin di sandbox/CI yang network-nya dibatasi, generate/migrate Prisma bakal gagal dengan error 403 — jalanin langkah ini di mesin dengan akses internet normal.

## Deploy ke Vercel

1. Push project ini ke GitHub
2. Import repo-nya di [vercel.com](https://vercel.com/new)
3. Di **Environment Variables**, masukin isi `.env` yang sama kayak lokal (`DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, dst)
4. Tambahin domain production ke Supabase **Authentication → URL Configuration → Redirect URLs** (`https://<domain-kamu>/auth/callback`), dan ke Authorized redirect URI di Google Cloud Console kalau belum ke-cover sama domain Supabase-nya
5. `postinstall` script udah otomatis jalanin `prisma generate` — Vercel bakal handle ini sendiri pas build
6. Deploy

Buat cron reminder H-1, daftarin `vercel.json` dengan schedule yang manggil `/api/cron/reminder` pakai header `Authorization: Bearer <CRON_SECRET>`, misalnya:
```json
{
  "crons": [
    { "path": "/api/cron/reminder", "schedule": "0 2 * * *" }
  ]
}
```
(jam di `schedule` itu UTC — `0 2 * * *` berarti jalan jam 09:00 WIB)

Buat daftarin webhook payment gateway, arahkan ke:
- Midtrans Dashboard → Settings → Configuration → Payment Notification URL → `https://<domain-kamu>/api/webhooks/midtrans`
- Xendit Dashboard → Settings → Webhooks → Invoice Paid/Expired → `https://<domain-kamu>/api/webhooks/xendit`, lalu salin Verification Token-nya ke env `PAYMENT_GATEWAY_CALLBACK_TOKEN`

## Lanjut ke Fase 5

Validasi ke pengguna nyata — outreach WA dingin ke 10-20 klinik/salon, tawarin akses gratis (trial 14 hari udah otomatis jalan begitu daftar lewat `/login`), kumpulin feedback, perbaiki bug/UX prioritas. Fase ini jalan paralel, nggak perlu nunggu fitur lain lengkap.
