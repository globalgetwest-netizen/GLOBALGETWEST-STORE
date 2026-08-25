"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [paymentLink, setPaymentLink] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [categories, setCategories] = useState<any[]>([])

  const [status, setStatus] = useState("draft")
  const [publishedState, setPublishedState] = useState("unpublished")

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageKey, setImageKey] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load product data
  useEffect(() => {
    async function loadProduct() {
      try {
        const res = await fetch(`/api/products?id=${encodeURIComponent(id)}`)
        if (!res.ok) {
          throw new Error("Failed to load product")
        }
        const product = await res.json()

        setName(product.name || "")
        setDescription(product.description || "")
        setPrice(product.base_price?.toString() || "")
        setPaymentLink(product.payment_link || "")
        setCategoryId(product.category_id || "")
        setStatus(product.status || "draft")
        setPublishedState(product.published_state || "unpublished")

        // Load current image Key
        if (product.images && product.images.length > 0) {
          setImageKey(product.images[0].image_key)
        }
      } catch (err) {
        console.error("Failed to load product:", err)
        setError("Failed to load product data")
      }
    }

    if (id) {
      loadProduct()
    }
  }, [id])

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/categories")
        if (!res.ok) {
          throw new Error("Failed to load categories")
        }
        const data = await res.json()
        setCategories(data || [])
      } catch (err) {
        console.error("Failed to load categories:", err)
      }
    }
    loadCategories()
  }, [])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImageFile(e.target.files[0])
    } else {
      setImageFile(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !description || !price || !categoryId) {
      setError("Please fill in all required fields")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("name", name)
      formData.append("description", description)
      formData.append("price", price)
      formData.append("categoryId", categoryId)
      formData.append("payment_link", paymentLink)
      formData.append("status", status)
      formData.append("published_state", publishedState)

      if (imageFile) {
        formData.append("file", imageFile)
      }

      const res = await fetch(`/api/products?id=${encodeURIComponent(id)}`, {
        method: "PUT",
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to update product")
      }

      alert("Product Updated Successfully")
      router.push("/admin/products")
    } catch (err: any) {
      setError(err.message || "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-blue-900 mb-8">Edit Product</h1>

      <div className="bg-white rounded-2xl shadow p-8 max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border w-full p-3 rounded mb-4"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border w-full p-3 rounded mb-4"
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price ($)</label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="border w-full p-3 rounded mb-4"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="border w-full p-3 rounded mb-4"
              required
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
            <div className="space-y-2">
              {imageKey && (
                <div>
                  <img
                    src={`https://${process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || "media.globalgetwest.com"}/${imageKey}`}
                    alt="Current product image"
                    className="max-w-xs h-auto rounded border"
                  />
                  <p className="text-xs text-gray-500">Current image (key: {imageKey})</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="border w-full p-3 rounded mb-4"
              />
              {imageFile && (
                <p className="text-sm text-gray-500 mt-1">
                  Selected: {imageFile.name}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Link</label>
            <input
              type="text"
              value={paymentLink}
              onChange={(e) => setPaymentLink(e.target.value)}
              className="border w-full p-3 rounded mb-4"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border w-full p-3 rounded mb-4"
              required
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Published State</label>
            <select
              value={publishedState}
              onChange={(e) => setPublishedState(e.target.value)}
              className="border w-full p-3 rounded mb-4"
              required
            >
              <option value="unpublished">Unpublished</option>
              <option value="published">Published</option>
            </select>
          </div>

          {error && (
            <p className="text-red-500 text-sm mt-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-900 text-white px-6 py-3 rounded-xl w-full"
          >
            {loading ? "Updating..." : "Update Product"}
          </button>
        </form>
      </div>
    </div>
  )
}
