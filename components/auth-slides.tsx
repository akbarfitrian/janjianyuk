"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tiga slide yang muter otomatis di panel kiri halaman auth.
 *
 * Urutannya sengaja ngikutin urutan keluhan yang bikin orang nyari tool
 * kayak gini: chat numpuk dulu (paling kerasa), baru jadwal tabrakan, baru
 * pelanggan yang nggak dateng. Slide 1 yang paling sering kebaca karena
 * tampil duluan, jadi pain point terkuat ditaruh di situ.
 *
 * Sengaja nggak ada paragraf penjelasan di bawah headline — panel ini
 * dijaga minimalis. Desktop: eyebrow, headline besar, satu baris ajakan.
 * Mobile: cuma satu kalimat headline versi kecil, rata tengah (eyebrow dan
 * ajakan disembunyiin) — kayak tagline di bawah wordmark.
 */
const SLIDES = [
  {
    eyebrow: "Booking online",
    headline: "Kelola janji temu, tanpa drama.",
    action: "Bikin halaman booking outlet kamu — gratis 14 hari.",
  },
  {
    eyebrow: "Kalender per staff",
    headline: "Jadwal penuh, bukan jadwal tabrakan.",
    action: "Atur jadwal semua staff dalam satu layar.",
  },
  {
    eyebrow: "Reminder WhatsApp",
    headline: "Pelanggan inget sendiri jadwalnya.",
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
      className="relative flex flex-1 flex-col justify-between gap-5 md:gap-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Semua slide ditumpuk di grid cell yang sama biar tinggi panelnya
          ngikutin slide terpanjang — tanpa ini panel bakal loncat-loncat
          tiap ganti slide. */}
      <div className="grid flex-1 items-start md:items-end">
        {SLIDES.map((slide, i) => {
          const isActive = i === index;
          return (
            <div
              key={slide.headline}
              aria-hidden={!isActive}
              className={`col-start-1 row-start-1 text-center transition-opacity duration-500 md:text-left ${
                isActive ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <p className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-accent md:block">
                {slide.eyebrow}
              </p>
              <p className="mx-auto max-w-[16rem] text-balance font-sans text-[13px] leading-relaxed text-ink-muted md:mx-0 md:mt-3 md:max-w-none md:font-serif md:text-[2.5rem] md:font-medium md:leading-[1.12] md:tracking-[-0.01em] md:text-ink">
                {slide.headline}
              </p>
              <p className="mt-6 hidden items-center gap-1.5 text-[13px] font-semibold text-azure md:flex">
                {slide.action}
                <span aria-hidden>→</span>
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 md:justify-start">
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