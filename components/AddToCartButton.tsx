"use client"

import { useState } from "react"

export default function AddToCartButton({
  productId
}: {
  productId: string
}) {
  const [loading, setLoading] = useState(false)

  async function addToCart() {
    setLoading(true)

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to add to cart")
      }

      alert("Product added to cart")
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={addToCart}
      disabled={loading}
      className="bg-blue-900 text-white px-10 py-4 rounded-xl font-bold"
    >
      {loading ? "Adding..." : "Add To Cart"}
    </button>
  )
}
