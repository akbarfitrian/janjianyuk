"use client";

import { useEffect } from "react";

/**
 * Dialog konfirmasi buat aksi yang nggak bisa dibatalin (hapus permanen).
 * Pengganti window.confirm() supaya tampilannya ngikutin tema dan nggak
 * kelihatan kayak popup bawaan browser.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Ya, hapus",
  cancelLabel = "Batal",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        aria-hidden="true"
        onClick={busy ? undefined : onCancel}
        className="absolute inset-0 bg-canvas/70"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="relative w-full max-w-sm rounded-xl border border-line-strong bg-surface p-5 shadow-xl"
      >
        <h2
          id="confirm-dialog-title"
          className="text-base font-semibold text-ink"
        >
          {title}
        </h2>
        <p id="confirm-dialog-desc" className="mt-2 text-sm text-ink-muted">
          {description}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border border-line-strong px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface-2 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-canvas hover:bg-danger-strong disabled:opacity-50"
          >
            {busy ? "Menghapus..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
