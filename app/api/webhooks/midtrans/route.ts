import { NextResponse } from "next/server";

import { mapMidtransStatus, verifyMidtransSignature } from "@/lib/payment";
import { applySubscriptionOutcome } from "@/lib/subscription";

// Handler notifikasi pembayaran dari Midtrans buat Subscription (billing
// outlet ke Janjianyuk, beda dari Transaction yang itu billing outlet ke
// pelanggan mereka sendiri). Daftarin URL endpoint ini di Midtrans Dashboard
// → Settings → Configuration → Payment Notification URL.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (
    !body?.order_id ||
    !body?.status_code ||
    !body?.gross_amount ||
    !body?.signature_key ||
    !body?.transaction_status
  ) {
    return NextResponse.json({ error: "Payload nggak lengkap." }, { status: 400 });
  }

  const isValid = verifyMidtransSignature({
    order_id: body.order_id,
    status_code: body.status_code,
    gross_amount: body.gross_amount,
    signature_key: body.signature_key,
  });

  if (!isValid) {
    console.warn("[webhook:midtrans] signature nggak valid — notifikasi diabaikan");
    return NextResponse.json({ error: "Signature nggak valid." }, { status: 401 });
  }

  const outcome = mapMidtransStatus(body.transaction_status);
  await applySubscriptionOutcome(body.order_id, outcome);

  return NextResponse.json({ received: true });
}
