// Shared shipping-address contract used by the checkout page (client) and the
// checkout API (server). Keeping it in one place means the form and the
// validator can never drift apart.

export type ShippingAddressInput = {
  full_name: string
  email: string
  phone: string
  country: string
  state_province: string
  city: string
  address_line_1: string
  address_line_2?: string
  postal_code: string
  delivery_instructions?: string
}

export const SHIPPING_FIELDS: (keyof ShippingAddressInput)[] = [
  "full_name",
  "email",
  "phone",
  "country",
  "state_province",
  "city",
  "address_line_1",
  "postal_code",
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Server-side validation. Returns the first human-readable error, or null when
// the address is acceptable. Required fields are checked explicitly so we never
// persist a half-filled snapshot.
export function validateShippingAddress(input: unknown): string | null {
  if (!input || typeof input !== "object") {
    return "Shipping address is required"
  }

  const addr = input as Record<string, unknown>

  for (const field of SHIPPING_FIELDS) {
    const value = addr[field]
    if (typeof value !== "string" || value.trim().length === 0) {
      return `Missing required field: ${field}`
    }
  }

  if (!EMAIL_RE.test(String(addr.email))) {
    return "A valid email is required"
  }

  if (String(addr.phone).trim().length < 5) {
    return "A valid phone number is required"
  }

  return null
}
