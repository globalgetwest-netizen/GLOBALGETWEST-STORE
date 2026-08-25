"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function AddToCart({
  productId
}: {
  productId: number
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function addToCart() {
    setLoading(true)

    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ productId }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          alert("Please login before adding products to cart")
          router.push("/auth/login")
          return
        }
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to add to cart: ${response.status}`)
      }

      alert("Added to cart")
    } catch (error: any) {
      console.error("Error adding to cart:", error)
      alert(error.message || "Failed to add to cart")
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