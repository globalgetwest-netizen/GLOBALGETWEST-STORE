"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"

export default function EditCategoryPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageKey, setImageKey] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load category data
  useEffect(() => {
    async function loadCategory() {
      try {
        const res = await fetch(`/api/categories?id=${encodeURIComponent(id)}`)
        if (!res.ok) {
          throw new Error("Failed to load category")
        }
        const data = await res.json()
        const category = data.category ?? data

        setName(category.name || "")
        setDescription(category.description || "")
        setImageKey(category.image_key || null)
      } catch (err) {
        console.error("Failed to load category:", err)
        setError("Failed to load category data")
      }
    }

    if (id) {
      loadCategory()
    }
  }, [id])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImageFile(e.target.files[0])
    } else {
      setImageFile(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !description) {
      setError("Please fill in all required fields")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("name", name)
      formData.append("description", description)

      if (imageFile) {
        formData.append("file", imageFile)
      }

      const res = await fetch(`/api/categories?id=${encodeURIComponent(id)}`, {
        method: "PUT",
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to update category")
      }

      alert("Category Updated Successfully")
      router.push("/admin/categories")
    } catch (err: any) {
      setError(err.message || "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-blue-900 mb-8">Edit Category</h1>

      <div className="bg-white shadow rounded-2xl p-8 max-w-xl">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Category Image</label>
            <div className="space-y-2">
              {imageKey && (
                <div>
                  <img
                    src={`https://${process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || "media.globalgetwest.com"}/${imageKey}`}
                    alt="Current category image"
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
            {loading ? "Updating..." : "Update Category"}
          </button>
        </form>
      </div>
    </div>
  )
}