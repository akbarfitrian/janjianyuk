"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tiga slide yang muter otomatis di panel kiri halaman auth.
 *
 * Urutannya sengaja ngikutin urutan keluhan yang bikin orang nyari tool
 * kayak gini: chat numpuk dulu (paling kerasa), baru jadwal tabrakan, baru
 * pelanggan yang nggak dateng. Slide 1 yang paling sering kebaca karena
 * tampil duluan, jadi pain point terkuat ditaruh di situ.
 */
const SLIDES = [
  {
    eyebrow: "Booking online",
    headline: "Kelola janji temu, tanpa drama.",
    body:
      "Pelanggan pilih layanan dan jam kosong sendiri lewat satu link. Nggak ada lagi chat “masih kosong nggak, kak?” yang numpuk tiap pagi.",
    action: "Bikin halaman booking outlet kamu — gratis 14 hari.",
  },
  {
    eyebrow: "Kalender per staff",
    headline: "Jadwal penuh, bukan jadwal tabrakan.",
    body:
      "Slot yang udah kepakai langsung ketutup buat staff itu. Dua pelanggan di jam dan terapis yang sama nggak akan kejadian.",
    action: "Atur jadwal semua staff dalam satu layar.",
  },
  {
    eyebrow: "Reminder WhatsApp",
    headline: "Pelanggan inget sendiri jadwalnya.",
    body:
      "Konfirmasi booking langsung kekirim, reminder H-1 nyusul otomatis ke WhatsApp mereka. Kamu nggak perlu ngetik satu-satu.",
    action: "Nyalain reminder otomatis hari ini.",
  },
];

const INTERVAL_MS = 6000;

export function AuthSlides() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  // Auto-rotate berhenti pas kursor/fokus ada di panel — biar orang yang lagi
  // baca slide-nya nggak keburu keganti. Yang minta reduced motion nggak
  // dapet auto-rotate sama sekali, tapi dot-nya tetep bisa diklik manual.
  useEffect(() => {
    if (paused || reducedMotion.current) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % SLIDES.length),
      INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <div
      className="relative flex flex-1 flex-col justify-between gap-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Semua slide ditumpuk di grid cell yang sama biar tinggi panelnya
          ngikutin slide terpanjang — tanpa ini panel bakal loncat-loncat
          tiap ganti slide. */}
      <div className="grid flex-1 items-end">
        {SLIDES.map((slide, i) => {
          const isActive = i === index;
          return (
            <div
              key={slide.headline}
              aria-hidden={!isActive}
              className={`col-start-1 row-start-1 transition-opacity duration-500 ${
                isActive ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                {slide.eyebrow}
              </p>
              <p className="mt-3 text-balance font-serif text-[2.5rem] font-medium leading-[1.12] tracking-[-0.01em] text-ink">
                {slide.headline}
              </p>
              <p className="mt-4 max-w-sm text-[15px] leading-[1.7] text-ink-subtle">
                {slide.body}
              </p>
              <p className="mt-5 flex items-center gap-1.5 text-[13px] font-semibold text-azure">
                {slide.action}
                <span aria-hidden>→</span>
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.headline}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Slide ${i + 1}: ${slide.headline}`}
            aria-current={i === index}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index
                ? "w-7 bg-accent"
                : "w-1.5 bg-line-strong hover:bg-ink-faint"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
