import { redirect } from "next/navigation";

// "/" langsung ke layar Masuk/Daftar — landing page marketing yang lama
// disimpan di /home (lihat app/(marketing)/home/page.tsx) kalau nanti
// mau dipasang lagi di URL lain.
export default function RootPage() {
  redirect("/login");
}
