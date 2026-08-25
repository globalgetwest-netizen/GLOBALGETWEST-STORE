"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function OrderStatus({
  orderId,
  currentStatus
}: {
  orderId: string
  currentStatus: string
}) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function updateStatus() {
    setLoading(true)

    const body: any = {}
    if (status === "Paid") {
      body.payment_status = "paid"
    } else {
      body.fulfillment_status = status.toLowerCase()
    }

    try {
      const res = await fetch(`/api/orders?id=${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        throw new Error("Failed to update order")
      }

      router.refresh()
    } catch (error) {
      console.error(error)
      alert("Failed to update order")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-3 items-center">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="border rounded-lg px-3 py-2"
      >
        <option value="Pending">Pending</option>
        <option value="Paid">Paid</option>
        <option value="Processing">Processing</option>
        <option value="Shipped">Shipped</option>
        <option value="Delivered">Delivered</option>
        <option value="Cancelled">Cancelled</option>
      </select>

      <button
        onClick={updateStatus}
        disabled={loading}
        className="bg-blue-900 text-white px-4 py-2 rounded-lg"
      >
        {loading ? "Saving..." : "Update"}
      </button>
    </div>
  )
}
