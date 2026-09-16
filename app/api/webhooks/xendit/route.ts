import { NextResponse } from "next/server";

import { mapXenditStatus, verifyXenditCallback } from "@/lib/payment";
import { applySubscriptionOutcome } from "@/lib/subscription";

// Handler notifikasi pembayaran dari Xendit buat Subscription. Daftarin URL
// endpoint ini di Xendit Dashboard → Settings → Webhooks, lalu salin
// "Verification Token" yang digenerate Xendit ke env
// PAYMENT_GATEWAY_CALLBACK_TOKEN (ini beda dari secret key API).
export async function POST(request: Request) {
  const callbackToken = request.headers.get("x-callback-token");

  if (!verifyXenditCallback(callbackToken)) {
    console.warn("[webhook:xendit] callback token nggak valid — notifikasi diabaikan");
    return NextResponse.json({ error: "Callback token nggak valid." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body?.external_id || !body?.status) {
    return NextResponse.json({ error: "Payload nggak lengkap." }, { status: 400 });
  }

  const outcome = mapXenditStatus(body.status);
  await applySubscriptionOutcome(body.external_id, outcome);

  return NextResponse.json({ received: true });
}
