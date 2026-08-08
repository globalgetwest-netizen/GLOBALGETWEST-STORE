import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { confirmOrderPaid } from "@/lib/orders"

// Paystack calls this after a payment. We verify the signature, and on a
// successful charge we mark the matching order paid (idempotent).
// Configure the URL in Paystack: Settings → API Keys & Webhooks → Webhook URL:
//   https://your-domain.com/api/webhooks/paystack
export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 500 })

  const raw = await req.text()
  const signature = req.headers.get("x-paystack-signature") || ""
  const expected = crypto.createHmac("sha512", secret).update(raw).digest("hex")

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 })
  }

  if (event?.event === "charge.success") {
    const reference = event?.data?.reference
    if (reference) {
      try {
        await confirmOrderPaid(reference)
      } catch {
        // Swallow — Paystack retries on non-2xx; the callback also confirms.
      }
    }
  }

  // Always 200 so Paystack stops retrying a handled event.
  return NextResponse.json({ received: true })
}
