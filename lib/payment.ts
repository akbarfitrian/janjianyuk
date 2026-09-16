// Wrapper payment gateway (Midtrans/Xendit) buat billing langganan outlet
// (Subscription) — beda dari lib/wa-gateway.ts yang itu WA, tapi pola
// switch-by-provider-nya sengaja disamain: satu env `PAYMENT_GATEWAY_PROVIDER`
// nentuin implementasi mana yang jalan.
//
// Midtrans pakai Snap API (bikin transaksi, dapet `redirect_url` ke halaman
// pembayaran hosted). Xendit pakai Invoice API (bikin invoice, dapet
// `invoice_url`). Dua-duanya sama-sama "redirect ke halaman gateway", jadi
// bentuk return-nya disamain di `CreateSubscriptionChargeResult`.

import crypto from "crypto";

import { PLANS, type PlanName } from "@/lib/plan";

export interface CreateSubscriptionChargeParams {
  outletName: string;
  ownerEmail: string;
  planName: PlanName;
  orderRef: string; // unik per percobaan bayar — dipakai sebagai order_id (Midtrans) / external_id (Xendit), dan buat nyocokin webhook balik ke Subscription
  redirectBaseUrl: string; // origin + /[outletSlug], buat balikin user ke halaman Billing setelah selesai bayar
}

export interface CreateSubscriptionChargeResult {
  success: boolean;
  redirectUrl?: string;
  gatewayRef?: string;
  error?: string;
}

function isProduction() {
  return process.env.PAYMENT_GATEWAY_IS_PRODUCTION === "true";
}

function basicAuthHeader(secretKey: string) {
  // Midtrans & Xendit dua-duanya pakai HTTP Basic Auth dengan secret key
  // sebagai username dan password kosong.
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

async function createViaMidtrans(
  secretKey: string,
  params: CreateSubscriptionChargeParams,
): Promise<CreateSubscriptionChargeResult> {
  const plan = PLANS[params.planName];
  const endpoint = isProduction()
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: basicAuthHeader(secretKey),
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: params.orderRef,
          gross_amount: plan.price,
        },
        customer_details: { email: params.ownerEmail },
        item_details: [
          {
            id: plan.name,
            price: plan.price,
            quantity: 1,
            name: `Janjianyuk ${plan.label} — langganan bulanan`,
          },
        ],
        callbacks: {
          finish: `${params.redirectBaseUrl}/settings/billing?status=finish`,
        },
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.redirect_url) {
      return {
        success: false,
        error:
          data?.error_messages?.join(", ") ??
          `Midtrans merespons status ${res.status}`,
      };
    }

    return {
      success: true,
      redirectUrl: data.redirect_url,
      gatewayRef: params.orderRef,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal konek ke Midtrans.",
    };
  }
}

async function createViaXendit(
  secretKey: string,
  params: CreateSubscriptionChargeParams,
): Promise<CreateSubscriptionChargeResult> {
  const plan = PLANS[params.planName];

  try {
    const res = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: basicAuthHeader(secretKey),
      },
      body: JSON.stringify({
        external_id: params.orderRef,
        amount: plan.price,
        payer_email: params.ownerEmail,
        description: `Janjianyuk ${plan.label} — langganan bulanan (${params.outletName})`,
        success_redirect_url: `${params.redirectBaseUrl}/settings/billing?status=finish`,
        failure_redirect_url: `${params.redirectBaseUrl}/settings/billing?status=failed`,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.invoice_url) {
      return {
        success: false,
        error: data?.message ?? `Xendit merespons status ${res.status}`,
      };
    }

    return {
      success: true,
      redirectUrl: data.invoice_url,
      gatewayRef: params.orderRef,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal konek ke Xendit.",
    };
  }
}

export async function createSubscriptionCharge(
  params: CreateSubscriptionChargeParams,
): Promise<CreateSubscriptionChargeResult> {
  const provider = process.env.PAYMENT_GATEWAY_PROVIDER ?? "xendit";
  const secretKey = process.env.PAYMENT_GATEWAY_SECRET_KEY;

  if (!secretKey) {
    console.warn(
      "[payment] PAYMENT_GATEWAY_SECRET_KEY belum diisi — charge tidak dibuat",
    );
    return {
      success: false,
      error: "Payment gateway belum dikonfigurasi di server (secret key kosong).",
    };
  }

  if (provider === "midtrans") {
    return createViaMidtrans(secretKey, params);
  }

  return createViaXendit(secretKey, params);
}

// ---------------------------------------------------------------------------
// Verifikasi & normalisasi notifikasi webhook — jangan pernah percaya body
// webhook mentah-mentah tanpa ini, siapa pun bisa POST ke endpoint publik.
// ---------------------------------------------------------------------------

export function verifyMidtransSignature(payload: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}) {
  const secretKey = process.env.PAYMENT_GATEWAY_SECRET_KEY;
  if (!secretKey) return false;

  // Rumus resmi Midtrans: SHA512(order_id + status_code + gross_amount + ServerKey)
  const raw = `${payload.order_id}${payload.status_code}${payload.gross_amount}${secretKey}`;
  const expected = crypto.createHash("sha512").update(raw).digest("hex");

  // Perbandingan panjang-tetap biar nggak kena timing attack.
  const expectedBuf = Buffer.from(expected, "hex");
  const gotBuf = Buffer.from(payload.signature_key, "hex");
  if (expectedBuf.length !== gotBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, gotBuf);
}

export function verifyXenditCallback(callbackToken: string | null) {
  const expected = process.env.PAYMENT_GATEWAY_CALLBACK_TOKEN;
  if (!expected || !callbackToken) return false;
  if (expected.length !== callbackToken.length) return false;

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(callbackToken));
}

export type PaymentOutcome = "paid" | "pending" | "failed";

export function mapMidtransStatus(transactionStatus: string): PaymentOutcome {
  if (transactionStatus === "capture" || transactionStatus === "settlement") {
    return "paid";
  }
  if (transactionStatus === "pending") return "pending";
  // deny, cancel, expire, failure
  return "failed";
}

export function mapXenditStatus(status: string): PaymentOutcome {
  if (status === "PAID" || status === "SETTLED") return "paid";
  if (status === "PENDING") return "pending";
  // EXPIRED dan status lain yang nggak dikenal dianggap gagal
  return "failed";
}
