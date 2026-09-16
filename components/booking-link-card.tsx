"use client";

import { useState } from "react";

export function BookingLinkCard({ bookingUrl }: { bookingUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API bisa gagal (browser lama, konteks non-HTTPS, dst) —
      // link tetap kelihatan di layar dan bisa disalin manual, jadi diemin
      // aja kalau gagal.
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-neutral-200 p-5">
      <p className="text-sm text-neutral-500">Link booking untuk pelanggan</p>
      <p className="mt-1 text-xs text-neutral-400">
        Tempel link ini di bio Instagram, status WhatsApp, atau kirim
        langsung ke pelanggan biar mereka bisa booking sendiri.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 truncate rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
          {bookingUrl}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
        >
          {copied ? "Tersalin!" : "Salin link"}
        </button>
      </div>
    </div>
  );
}
