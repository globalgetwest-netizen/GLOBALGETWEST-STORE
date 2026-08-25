"use client"

import { useRouter, useSearchParams } from "next/navigation"

export default function SortSelect({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("sort", value)
    router.push(`/products?${params.toString()}`)
  }

  return (
    <select
      defaultValue={defaultValue}
      className="border border-gray-300 rounded-md p-2 text-sm bg-white"
      onChange={(e) => handleSort(e.target.value)}
    >
      <option value="newest">Newest Arrivals</option>
      <option value="price-asc">Price: Low to High</option>
      <option value="price-desc">Price: High to Low</option>
      <option value="name-asc">Name: A to Z</option>
    </select>
  )
}
