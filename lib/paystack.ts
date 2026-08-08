// Paystack server helpers (Ghana: cards + mobile money).
// Uses the secret key — import this ONLY from server code (API routes).

const PAYSTACK_BASE = "https://api.paystack.co"

function secret(): string {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new Error("Missing PAYSTACK_SECRET_KEY")
  return key
}

export type InitParams = {
  email: string
  amountGhs: number // amount in GHS (major units)
  reference: string
  callbackUrl: string
  metadata?: Record<string, unknown>
}

// Start a transaction. Returns the hosted checkout URL to redirect the buyer to.
export async function initializeTransaction(p: InitParams): Promise<{
  authorization_url: string
  access_code: string
  reference: string
}> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: p.email,
      amount: Math.round(p.amountGhs * 100), // pesewas
      currency: "GHS",
      reference: p.reference,
      callback_url: p.callbackUrl,
      metadata: p.metadata ?? {},
      channels: ["card", "mobile_money", "bank", "ussd"],
    }),
  })

  const json = await res.json()
  if (!res.ok || !json.status) {
    throw new Error(json.message || "Failed to initialize payment")
  }
  return json.data
}

// Confirm a transaction with Paystack (source of truth).
export async function verifyTransaction(reference: string): Promise<{
  paid: boolean
  amountGhs: number
  currency: string
  raw: unknown
}> {
  const res = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret()}` }, cache: "no-store" },
  )
  const json = await res.json()
  if (!res.ok || !json.status) {
    throw new Error(json.message || "Failed to verify payment")
  }
  const data = json.data
  return {
    paid: data.status === "success",
    amountGhs: (data.amount ?? 0) / 100,
    currency: data.currency,
    raw: data,
  }
}
