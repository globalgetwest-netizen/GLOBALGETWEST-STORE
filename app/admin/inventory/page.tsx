"use client";

import { getR2ObjectUrl } from "@/lib/media"
import InventoryManager from "@/components/InventoryManager"
import { useState, useEffect } from "react"
import type { Prisma } from "@/lib/generated/prisma/index"

type ProductWithImages = Prisma.ProductGetPayload<{
  include: {
    images: {
      select: {
        image_key: true,
      },
      take: 1,
    },
  },
}>

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductWithImages[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductWithImages | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data)
        setLoading(false)
      })
      .catch(err => console.error(err))
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-8">Inventory Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-white p-5 rounded-2xl shadow">
            <img
              src={product.images?.[0]?.image_key ? getR2ObjectUrl(product.images[0].image_key) : "/placeholder.png"}
              alt={product.name}
              className="w-full h-52 object-cover rounded-2xl"
            />
            <h2 className="text-2xl font-bold text-blue-900 mt-5">
              {product.name}
            </h2>
            <p className="text-green-700 font-bold text-xl mt-3">
              
            </p>
            <div className="mt-5 bg-green-100 text-green-700 px-5 py-3 rounded-xl font-semibold">
              Available: {product.stock_quantity}
            </div>
            <button
              onClick={() => setSelectedProduct(product)}
              className="mt-5 w-full bg-blue-900 text-white py-3 rounded-xl font-bold"
            >
              {selectedProduct?.id === product.id ? "Cancel" : "Manage Stock"}
            </button>
            {selectedProduct?.id === product.id && (
              <InventoryManager
                productId={product.id}
                currentStock={product.stock_quantity}
              />
            )}
          </div>
        ))}
      </div>
    </main>
  )
}
