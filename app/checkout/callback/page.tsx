import Link from "next/link"
import { verifyTransaction } from "@/lib/paystack"
import { confirmOrderPaid } from "@/lib/orders"

// Buyer lands here after Paystack. We verify the transaction server-side and
// finalize the order (idempotent — the webhook may have already done it).
export default async function CheckoutCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>
}) {
  const sp = await searchParams
  const reference = sp.reference || sp.trxref

  let paid = false
  let error = ""

  if (!reference) {
    error = "Missing payment reference."
  } else {
    try {
      const result = await verifyTransaction(reference)
      paid = result.paid
      if (paid) await confirmOrderPaid(reference)
      else error = "Your payment was not completed."
    } catch (e: any) {
      error = e?.message || "We couldn't verify your payment."
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow p-10 max-w-md w-full text-center">
        {paid ? (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment successful</h1>
            <p className="text-gray-600 mb-8">
              Thank you! Your order has been confirmed and is now being processed.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/account" className="bg-blue-950 text-white py-3 rounded-lg font-semibold">
                View my orders
              </Link>
              <Link href="/" className="text-blue-950 font-semibold">
                Continue shopping
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment not completed</h1>
            <p className="text-gray-600 mb-8">{error || "Your payment did not go through."}</p>
            <div className="flex flex-col gap-3">
              <Link href="/cart" className="bg-blue-950 text-white py-3 rounded-lg font-semibold">
                Back to cart
              </Link>
              <Link href="/" className="text-blue-950 font-semibold">
                Continue shopping
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
