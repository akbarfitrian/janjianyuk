// Wrapper WA gateway (Fonnte/Wablas). Dipakai buat konfirmasi booking
// instan (Fase 2) dan reminder H-1 (Fase 2, lewat cron). Kalau
// WA_GATEWAY_TOKEN belum diisi di .env, fungsi ini gagal dengan pesan yang
// jelas tapi nggak throw — pemanggilnya (lib/notifications.ts) tetap
// nyimpen NotificationLog dengan status "failed" dan booking-nya sendiri
// tetap sukses dibuat.

import { normalizePhone } from "@/lib/phone";

export interface SendWaMessageParams {
  phone: string; // boleh format 08xxx, +62xxx, atau 62xxx
  message: string;
}

export interface SendWaMessageResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

// Fonnte & Wablas dua-duanya pakai format nomor 62xxxxxxxxxx tanpa "+".
// Nomor yang lolos normalizePhone (lib/phone.ts) dipakai apa adanya; kalau
// nggak valid (data lama / nomor luar negeri) jatuh ke digit mentahnya biar
// perilakunya sama kayak sebelum ada normalisasi.
function toGatewayTarget(phone: string) {
  return normalizePhone(phone) ?? phone.replace(/[^0-9]/g, "");
}

async function sendViaFonnte(
  token: string,
  target: string,
  message: string,
): Promise<SendWaMessageResult> {
  try {
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target, message }),
    });

    const data = await res.json().catch(() => null);

    // Respons Fonnte: { status: true/false, id: [...], reason?: string }.
    // Cek field ini kalau ternyata beda pas integrasi asli — dokumentasi
    // resmi Fonnte jadi rujukan terakhir, bukan komentar ini.
    if (!res.ok || data?.status === false) {
      return {
        success: false,
        error: data?.reason ?? `Fonnte merespons status ${res.status}`,
      };
    }

    return {
      success: true,
      providerMessageId: Array.isArray(data?.id) ? data.id[0] : data?.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal konek ke Fonnte.",
    };
  }
}

async function sendViaWablas(
  token: string,
  baseUrl: string,
  target: string,
  message: string,
): Promise<SendWaMessageResult> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/send-message`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone: target, message }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || data?.status === false) {
      return {
        success: false,
        error: data?.message ?? `Wablas merespons status ${res.status}`,
      };
    }

    return { success: true, providerMessageId: data?.data?.[0]?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal konek ke Wablas.",
    };
  }
}

export async function sendWaMessage({
  phone,
  message,
}: SendWaMessageParams): Promise<SendWaMessageResult> {
  const provider = process.env.WA_GATEWAY_PROVIDER ?? "fonnte";
  const token = process.env.WA_GATEWAY_TOKEN;
  const target = toGatewayTarget(phone);

  if (!token) {
    console.warn("[wa-gateway] WA_GATEWAY_TOKEN belum diisi — pesan tidak dikirim");
    return { success: false, error: "WA_GATEWAY_TOKEN belum dikonfigurasi." };
  }

  if (provider === "wablas") {
    // Domain Wablas beda-beda per akun (mis. https://sby.wablas.com), jadi
    // nggak bisa di-hardcode — wajib diisi lewat env sendiri.
    const baseUrl = process.env.WA_GATEWAY_BASE_URL;
    if (!baseUrl) {
      return {
        success: false,
        error:
          "WA_GATEWAY_BASE_URL wajib diisi buat provider Wablas (domain beda-beda per akun).",
      };
    }
    return sendViaWablas(token, baseUrl, target, message);
  }

  return sendViaFonnte(token, target, message);
}
