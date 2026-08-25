"use client"

import { useEffect, useState } from "react"

export default function CartPage() {
  const [carts, setCarts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  async function getCart() {
    try {
      const response = await fetch("/api/cart", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        if (response.status === 401) {
          setLoading(false)
          return
        }
        throw new Error(`Failed to fetch cart: ${response.status}`)
      }

      const data = await response.json()
      setCarts(data.items || [])
      setLoading(false)
    } catch (error) {
      console.error("Error fetching cart:", error)
      setLoading(false)
    }
  }

  async function updateQuantity(cartId: number, quantity: number) {
    if (quantity < 1) {
      return
    }

    try {
      const response = await fetch("/api/cart", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ cartItemId: cartId, quantity }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update quantity: ${response.status}`)
      }

      await getCart()
    } catch (error) {
      console.error("Error updating cart quantity:", error)
    }
  }

  async function removeItem(cartId: number) {
    try {
      const response = await fetch("/api/cart", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ cartItemId: cartId }),
      })

      if (!response.ok) {
        throw new Error(`Failed to remove item: ${response.status}`)
      }

      await getCart()
    } catch (error) {
      console.error("Error removing cart item:", error)
    }
  }

  useEffect(() => {
    getCart()
  }, [])

  const total = carts.reduce(
    (sum, item) => {
      return sum + Number(item.product.price) * Number(item.quantity)
    },
    0
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-3xl font-bold text-blue-900">
          Loading Cart...
        </h1>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-900">
            Please Login To View Cart
          </h1>
          <a
            href="/auth/login"
            className="inline-block mt-6 bg-yellow-400 px-8 py-3 rounded-xl font-bold"
          >
            Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="lg:col-span-2 space-y-5">
        {carts.length > 0 ? (
          carts.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow p-5 flex gap-6"
            >
              <img
                src={item.product.image || "/placeholder.png"}
                alt={item.product.name}
                className="w-32 h-32 object-cover rounded-xl"
              />
              <div className="flex-1">
                <h2 className="text-xl font-bold text-blue-900">
                  {item.product.name}
                </h2>
                <p className="text-green-700 font-bold mt-2">
                  GHâ‚µ{item.product.price}
                </p>
                <div className="flex gap-4 items-center mt-5">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="bg-gray-200 px-4 py-2 rounded"
                  >
                    -
                  </button>
                  <span className="font-bold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="bg-gray-200 px-4 py-2 rounded"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex gap-4 items-center mt-5">
                <button
                  onClick={() => removeItem(item.id)}
                  className="mt-5 bg-red-600 text-white px-5 py-2 rounded"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-10 rounded-xl text-center">
            <h2 className="text-2xl font-bold text-gray-600">
              Your cart is empty
            </h2>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow p-8 h-fit">
        <h2 className="text-2xl font-bold text-blue-900 mb-6">
          Order Summary
        </h2>
        <div className="flex justify-between text-lg">
          <span>Total:</span>
          <span className="font-bold text-green-700">GHâ‚µ{total}</span>
        </div>
        <div className="mt-6">
          <a
            href="/checkout"
            className="mt-8 block text-center w-full bg-yellow-400 py-4 rounded-xl font-bold"
          >
            Proceed To Checkout
          </a>
        </div>
      </div>
    </main>
  )
}
