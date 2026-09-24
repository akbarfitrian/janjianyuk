"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  DEFAULT_CATEGORY_SUGGESTIONS,
  DURATION_PRESETS,
  SERVICE_LIMITS,
  formatDuration,
  formatServicePrice,
  groupByCategory,
} from "@/lib/services";

type ServiceRow = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  durationMin: number;
  price: number;
  priceFrom: boolean;
  isActive: boolean;
  usedCount: number;
};

// Durasi dan harga disimpan sebagai string angka (digit saja) selama diketik,
// baru diubah ke Number pas dikirim.
type FormValues = {
  name: string;
  category: string;
  description: string;
  durationMin: string;
  price: string;
  priceFrom: boolean;
};

type ApiData = { error?: string; services?: ServiceRow[] };

const emptyValues: FormValues = {
  name: "",
  category: "",
  description: "",
  durationMin: "",
  price: "",
  priceFrom: false,
};

const inputBase =
  "w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-azure focus:outline-none";

const chipBase =
  "rounded-full border px-2.5 py-1 text-xs transition-colors";

const rowButton =
  "rounded-md px-2 py-1 text-xs font-medium text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50";

function toValues(service: ServiceRow): FormValues {
  return {
    name: service.name,
    category: service.category ?? "",
    description: service.description ?? "",
    durationMin: String(service.durationMin),
    price: String(service.price),
    priceFrom: service.priceFrom,
  };
}

function toPayload(values: FormValues) {
  return {
    name: values.name,
    category: values.category,
    description: values.description,
    durationMin: Number(values.durationMin),
    price: Number(values.price),
    priceFrom: values.priceFrom,
  };
}

function digitsOnly(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function formatDigits(value: string) {
  return value === "" ? "" : Number(value).toLocaleString("id-ID");
}

async function callApi(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; data: ApiData }> {
  try {
    const res = await fetch(url, init);
    // Body bisa kosong/bukan JSON kalau server error — jangan sampai
    // res.json() yang nge-crash halaman.
    const data = (await res.json().catch(() => ({}))) as ApiData;
    return { ok: res.ok, data };
  } catch {
    return {
      ok: false,
      data: { error: "Nggak bisa konek ke server. Coba lagi ya." },
    };
  }
}

function ServiceForm({
  initial,
  submitLabel,
  categoryOptions,
  autoFocusName = false,
  resetOnSuccess = false,
  onSubmit,
  onCancel,
}: {
  initial: FormValues;
  submitLabel: string;
  categoryOptions: string[];
  autoFocusName?: boolean;
  resetOnSuccess?: boolean;
  onSubmit: (values: FormValues) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const uid = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!autoFocusName) return;
    nameRef.current?.focus();
    nameRef.current?.select();
  }, [autoFocusName]);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.durationMin || Number(values.durationMin) < 1) {
      setError("Durasi wajib diisi, minimal 1 menit.");
      return;
    }
    if (!values.price) {
      setError("Harga wajib diisi. Isi 0 kalau gratis.");
      return;
    }

    setBusy(true);
    const message = await onSubmit(values);
    setBusy(false);

    if (message) {
      setError(message);
      return;
    }
    if (resetOnSuccess) setValues(emptyValues);
  }

  const duration = Number(values.durationMin);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid items-start gap-4 md:grid-cols-[2fr_1fr]">
        <div>
          <label
            htmlFor={`${uid}-name`}
            className="block text-sm font-medium text-ink"
          >
            Nama layanan
          </label>
          <input
            id={`${uid}-name`}
            ref={nameRef}
            required
            maxLength={SERVICE_LIMITS.name}
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="mis. Potong Rambut"
            className={`mt-1 ${inputBase}`}
          />
        </div>
        <div>
          <label
            htmlFor={`${uid}-category`}
            className="block text-sm font-medium text-ink"
          >
            Kategori{" "}
            <span className="font-normal text-ink-subtle">(opsional)</span>
          </label>
          <input
            id={`${uid}-category`}
            maxLength={SERVICE_LIMITS.category}
            value={values.category}
            onChange={(e) => set("category", e.target.value)}
            placeholder="mis. Potong"
            className={`mt-1 ${inputBase}`}
          />
          {categoryOptions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {categoryOptions.map((option) => {
                const selected =
                  values.category.trim().toLowerCase() ===
                  option.toLowerCase();
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => set("category", option)}
                    className={`${chipBase} ${
                      selected
                        ? "border-accent bg-accent-soft text-ink"
                        : "border-line-strong text-ink-muted hover:bg-surface-2"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor={`${uid}-description`}
          className="block text-sm font-medium text-ink"
        >
          Deskripsi{" "}
          <span className="font-normal text-ink-subtle">(opsional)</span>
        </label>
        <input
          id={`${uid}-description`}
          maxLength={SERVICE_LIMITS.description}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="mis. Sudah termasuk keramas dan pijat kepala ringan"
          className={`mt-1 ${inputBase}`}
        />
      </div>

      <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
        <div className="w-full sm:w-64">
          <label
            htmlFor={`${uid}-duration`}
            className="block text-sm font-medium text-ink"
          >
            Durasi (menit)
          </label>
          <input
            id={`${uid}-duration`}
            required
            inputMode="numeric"
            value={values.durationMin}
            onChange={(e) => set("durationMin", digitsOnly(e.target.value, 3))}
            placeholder="45"
            className={`mt-1 ${inputBase}`}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DURATION_PRESETS.map((preset) => (
              <button
                key={preset.minutes}
                type="button"
                onClick={() => set("durationMin", String(preset.minutes))}
                className={`${chipBase} ${
                  duration === preset.minutes
                    ? "border-accent bg-accent-soft text-ink"
                    : "border-line-strong text-ink-muted hover:bg-surface-2"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {duration >= 60 && (
            <p className="mt-1.5 text-xs text-ink-subtle">
              = {formatDuration(duration)}
            </p>
          )}
        </div>

        <div className="w-full sm:w-56">
          <label
            htmlFor={`${uid}-price`}
            className="block text-sm font-medium text-ink"
          >
            Harga
          </label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-ink-subtle">
              Rp
            </span>
            <input
              id={`${uid}-price`}
              required
              inputMode="numeric"
              value={formatDigits(values.price)}
              onChange={(e) => set("price", digitsOnly(e.target.value, 9))}
              placeholder="50.000"
              className={`${inputBase} pl-9`}
            />
          </div>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
            <input
              type="checkbox"
              checked={values.priceFrom}
              onChange={(e) => set("priceFrom", e.target.checked)}
              className="h-3.5 w-3.5 accent-accent"
            />
            Harga mulai dari
          </label>
          {values.priceFrom && (
            <p className="mt-1 text-xs text-ink-subtle">
              Tampil sebagai &ldquo;Mulai Rp…&rdquo; di halaman booking.
              Nominal akhir bisa diubah di Kasir.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? "Menyimpan..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-line-strong px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface-2"
          >
            Batal
          </button>
        )}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}

function ServiceLine({
  service,
  busy,
  onEdit,
  onDuplicate,
  onToggle,
  onDelete,
}: {
  service: ServiceRow;
  busy: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const dim = service.isActive ? "" : "opacity-60";
  const duration = formatDuration(service.durationMin);
  const price = formatServicePrice(service.price, service.priceFrom);

  // Tiga tingkat layout, sengaja pakai breakpoint yang lebih tinggi dari
  // "md": di md sidebar (14rem) sudah makan tempat, jadi lebar konten cuma
  // ~500px — kolom durasi/harga/tombol nggak muat berjajar sama nama.
  //  - < sm : semuanya numpuk (nama, ringkasan, tombol)
  //  - sm..xl: dua kolom — nama + ringkasan di kiri, tombol di kanan
  //  - xl+  : satu baris, durasi dan harga masing-masing satu kolom. Kolom
  //            tombol dikasih lebar tetap biar durasi/harga lurus antar baris
  //            (baris tanpa tombol Hapus lebih pendek).
  return (
    <div className="grid gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,1fr)_7rem_8rem_17rem] xl:items-center">
      <div
        className={`min-w-0 sm:col-start-1 sm:row-start-1 xl:col-auto xl:row-auto ${dim}`}
      >
        <p className="text-sm text-ink">{service.name}</p>
        {service.description && (
          <p className="mt-0.5 text-xs text-ink-subtle">
            {service.description}
          </p>
        )}
      </div>

      <p
        className={`text-sm text-ink-muted sm:col-start-1 sm:row-start-2 xl:hidden ${dim}`}
      >
        {duration} · {price}
      </p>
      <p className={`hidden text-sm text-ink-muted xl:block ${dim}`}>
        {duration}
      </p>
      <p className={`hidden text-sm text-ink-muted xl:block ${dim}`}>
        {price}
      </p>

      <div className="-ml-2 mt-1 flex flex-wrap items-center gap-0.5 sm:col-start-2 sm:row-[1/span_2] sm:ml-0 sm:mt-0 sm:justify-end sm:self-center xl:col-auto xl:row-auto">
        <button type="button" onClick={onEdit} className={rowButton}>
          Ubah
        </button>
        <button type="button" onClick={onDuplicate} className={rowButton}>
          Duplikat
        </button>
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          className={rowButton}
        >
          {service.isActive ? "Nonaktifkan" : "Aktifkan"}
        </button>
        {service.usedCount === 0 && (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className={`${rowButton} hover:bg-danger-soft hover:text-danger`}
          >
            Hapus
          </button>
        )}
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [seed, setSeed] = useState<{ key: number; values: FormValues } | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const createRef = useRef<HTMLDivElement>(null);
  const seedCounter = useRef(0);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyLoad = useCallback((ok: boolean, data: ApiData) => {
    if (ok) {
      setLoadError(null);
      setServices(data.services ?? []);
    } else {
      setLoadError(data.error ?? "Gagal memuat layanan.");
    }
    setIsLoading(false);
  }, []);

  // Dipakai buat muat ulang setelah tambah/ubah/hapus.
  const loadServices = useCallback(async () => {
    const { ok, data } = await callApi("/api/services?all=1");
    applyLoad(ok, data);
  }, [applyLoad]);

  // Muat awal: setState-nya jalan di callback promise (bukan langsung di
  // body effect), dan dibatalin kalau halaman keburu ditinggalkan.
  useEffect(() => {
    let active = true;
    callApi("/api/services?all=1").then(({ ok, data }) => {
      if (active) applyLoad(ok, data);
    });
    return () => {
      active = false;
    };
  }, [applyLoad]);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  function showNotice(message: string) {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 5000);
  }

  const activeGroups = useMemo(
    () => groupByCategory(services.filter((s) => s.isActive)),
    [services],
  );
  const inactiveServices = useMemo(
    () => services.filter((s) => !s.isActive),
    [services],
  );
  const hasCategories = activeGroups.some((g) => g.category !== null);

  // Kategori yang sudah dipakai jadi chip; kalau belum ada satu pun, kasih
  // saran umum biar owner baru nggak mulai dari kolom kosong.
  const categoryOptions = useMemo(() => {
    if (isLoading) return [];
    const seen = new Map<string, string>();
    for (const s of services) {
      if (s.category && !seen.has(s.category.toLowerCase())) {
        seen.set(s.category.toLowerCase(), s.category);
      }
    }
    const existing = [...seen.values()];
    return existing.length > 0 ? existing : DEFAULT_CATEGORY_SUGGESTIONS;
  }, [services, isLoading]);

  async function createService(values: FormValues) {
    const { ok, data } = await callApi("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(values)),
    });
    if (!ok) return data.error ?? "Gagal menyimpan layanan.";

    setSeed(null);
    await loadServices();
    showNotice(`"${values.name.trim()}" sudah ditambahkan.`);
    return null;
  }

  async function updateService(id: string, values: FormValues) {
    const { ok, data } = await callApi(`/api/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(values)),
    });
    if (!ok) return data.error ?? "Gagal menyimpan perubahan.";

    setEditingId(null);
    await loadServices();
    return null;
  }

  async function toggleActive(service: ServiceRow) {
    setActionError(null);
    setBusyId(service.id);
    const { ok, data } = await callApi(`/api/services/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !service.isActive }),
    });
    setBusyId(null);

    if (!ok) {
      setActionError(data.error ?? "Gagal mengubah status layanan.");
      return;
    }
    await loadServices();
    showNotice(
      service.isActive
        ? `"${service.name}" dinonaktifkan. Nggak akan muncul di booking baru.`
        : `"${service.name}" aktif lagi.`,
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setActionError(null);
    setIsDeleting(true);
    const { ok, data } = await callApi(`/api/services/${deleteTarget.id}`, {
      method: "DELETE",
    });
    setIsDeleting(false);

    const name = deleteTarget.name;
    setDeleteTarget(null);

    if (!ok) {
      setActionError(data.error ?? "Gagal menghapus layanan.");
      // Bisa jadi statusnya udah berubah (mis. baru dipakai booking) —
      // muat ulang biar tombol Hapus-nya ikut hilang.
      await loadServices();
      return;
    }
    await loadServices();
    showNotice(`"${name}" dihapus.`);
  }

  function startDuplicate(service: ServiceRow) {
    setEditingId(null);
    seedCounter.current += 1;
    setSeed({ key: seedCounter.current, values: toValues(service) });
    createRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function renderItem(service: ServiceRow) {
    if (editingId === service.id) {
      return (
        <div className="bg-surface-2/40 px-4 py-4">
          <ServiceForm
            initial={toValues(service)}
            submitLabel="Simpan"
            categoryOptions={categoryOptions}
            onSubmit={(values) => updateService(service.id, values)}
            onCancel={() => setEditingId(null)}
          />
        </div>
      );
    }

    return (
      <ServiceLine
        service={service}
        busy={busyId === service.id}
        onEdit={() => {
          setSeed(null);
          setEditingId(service.id);
        }}
        onDuplicate={() => startDuplicate(service)}
        onToggle={() => toggleActive(service)}
        onDelete={() => setDeleteTarget(service)}
      />
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Layanan</h1>
      <p className="mt-1 text-sm text-ink-subtle">
        Yang ada di sini yang tampil di halaman booking pelanggan. Layanan
        yang sudah pernah dibooking nggak bisa dihapus, tapi bisa dinonaktifkan
        — riwayatnya tetap aman.
      </p>

      <div
        ref={createRef}
        className="mt-6 rounded-lg border border-line p-4 sm:p-5"
      >
        <p className="mb-4 text-sm font-medium text-ink">
          {seed ? "Duplikat layanan" : "Tambah layanan"}
        </p>
        <ServiceForm
          key={seed?.key ?? "new"}
          initial={seed?.values ?? emptyValues}
          submitLabel="Tambah"
          categoryOptions={categoryOptions}
          autoFocusName={seed !== null}
          resetOnSuccess
          onSubmit={createService}
          onCancel={seed ? () => setSeed(null) : undefined}
        />
      </div>

      {notice && (
        <p
          role="status"
          className="mt-4 rounded-md border border-ok-line bg-ok-soft px-4 py-2 text-sm text-ok"
        >
          {notice}
        </p>
      )}
      {actionError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {actionError}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <p className="rounded-lg border border-line px-4 py-6 text-center text-sm text-ink-subtle">
            Memuat...
          </p>
        ) : loadError ? (
          <div className="rounded-lg border border-danger-line bg-danger-soft px-4 py-6 text-center">
            <p className="text-sm text-danger">{loadError}</p>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                loadServices();
              }}
              className="mt-3 text-sm font-medium text-danger-strong underline underline-offset-4"
            >
              Coba lagi
            </button>
          </div>
        ) : services.length === 0 ? (
          <p className="rounded-lg border border-line px-4 py-6 text-center text-sm text-ink-subtle">
            Belum ada layanan. Tambahin dulu lewat form di atas.
          </p>
        ) : (
          <>
            {activeGroups.map((group) => (
              <section
                key={group.key}
                className="overflow-hidden rounded-lg border border-line"
              >
                {hasCategories && (
                  <header className="flex items-center justify-between bg-surface-2 px-4 py-2">
                    <h2 className="text-sm font-medium text-ink">
                      {group.label}
                    </h2>
                    <span className="text-xs text-ink-subtle">
                      {group.items.length} layanan
                    </span>
                  </header>
                )}
                <ul className="divide-y divide-line">
                  {group.items.map((service) => (
                    <li key={service.id}>{renderItem(service)}</li>
                  ))}
                </ul>
              </section>
            ))}

            {inactiveServices.length > 0 && (
              <section className="overflow-hidden rounded-lg border border-line">
                <header className="flex items-center justify-between bg-surface-2 px-4 py-2">
                  <h2 className="text-sm font-medium text-ink-muted">
                    Nonaktif
                  </h2>
                  <span className="text-xs text-ink-subtle">
                    Nggak tampil di booking baru
                  </span>
                </header>
                <ul className="divide-y divide-line">
                  {inactiveServices.map((service) => (
                    <li key={service.id}>{renderItem(service)}</li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus layanan ini?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" bakal dihapus permanen. Layanan ini belum pernah dipakai di booking maupun paket.`
            : ""
        }
        busy={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
