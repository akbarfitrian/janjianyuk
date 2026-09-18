import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/session-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// "variable" (bukan array weight statis) — ini yang bikin Fraunces kepake
// sebagai variable font, jadi sumbu "optical size"-nya jalan otomatis
// (browser narik bentuk huruf yang lebih dekoratif pas dirender gede buat
// headline, dan balik ke bentuk yang lebih rapat/mudah dibaca pas kecil).
// Weight tunggal per elemen ("font-medium" dsb) tetap bisa dipakai seperti biasa.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Janjianyuk",
  description:
    "Halaman booking online, kalender per staff, dan reminder WA otomatis buat klinik kecantikan, salon, dan barbershop.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    title: "Janjianyuk",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#060a0f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}