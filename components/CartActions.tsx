"use client"

import { useRouter } from "next/navigation"

export default function CartActions({
  cartItemId,
  quantity
}: {
  cartItemId: string
  quantity: number
}) {
  const router = useRouter()

  async function updateQuantity(newQuantity: number) {
    if (newQuantity < 1) return

    try {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItemId, quantity: newQuantity }),
      })

      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to update quantity")
      }
    } catch (err) {
      alert("Failed to update quantity")
    }
  }

  async function removeItem() {
    try {
      const res = await fetch("/api/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItemId }),
      })

      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to remove item")
      }
    } catch (err) {
      alert("Failed to remove item")
    }
  }

  return (
    <div className="mt-4 flex items-center gap-3">
      <button
        onClick={() => updateQuantity(quantity - 1)}
        className="bg-gray-200 px-4 py-2 rounded-lg"
      >
        -
      </button>

      <span className="font-bold">{quantity}</span>

      <button
        onClick={() => updateQuantity(quantity + 1)}
        className="bg-gray-200 px-4 py-2 rounded-lg"
      >
        +
      </button>

      <button
        onClick={removeItem}
        className="ml-5 bg-red-600 text-white px-5 py-2 rounded-lg"
      >
        Remove
      </button>
    </div>
  )
}
