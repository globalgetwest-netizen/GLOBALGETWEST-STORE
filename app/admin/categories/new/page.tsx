"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function NewCategoryPage() {
  const router = useRouter()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImageFile(e.target.files[0])
    } else {
      setImageFile(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !description || !imageFile) {
      setError("Please fill in all fields and select an image")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("name", name)
      formData.append("description", description)
      formData.append("file", imageFile)
      formData.append("type", "category")

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to upload image")
      }

      const uploadResult = await res.json()
      
      // Now create the category with the uploaded image key
      const categoryRes = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          image_key: uploadResult.objectKey, // Store the object key, not URL
        }),
      })

      if (!categoryRes.ok) {
        const errorData = await categoryRes.json()
        throw new Error(errorData.error || "Failed to create category")
      }

      router.push("/admin/categories")
    } catch (err: any) {
      setError(err.message || "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-blue-900 mb-8">
        Add New Category
      </h1>

      <div className="bg-white rounded-2xl shadow p-8">
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
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="border w-full p-3 rounded mb-4"
              required
            />
            {imageFile && (
              <p className="text-sm text-gray-500 mt-1">
                Selected: {imageFile.name}
              </p>
            )}
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
            {loading ? "Creating..." : "Create Category"}
          </button>
        </form>
      </div>
    </div>
  )
}
