"use client"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

export default function ProductFilters({ 
  categories, 
  filterState,
  mobile = false 
}: { 
  categories: any[], 
  filterState: any,
  mobile?: boolean
}) {
  const searchParams = useSearchParams()

  const buildUrl = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value)
      else params.delete(key)
    })
    return `/products?${params.toString()}`
  }

  const content = (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="font-bold text-gray-900 mb-4">Categories</h3>
      <ul className="space-y-2 mb-6">
        <li>
          <Link href={buildUrl({ category: '' })} className={`text-sm ${!filterState.category ? "text-blue-900 font-bold" : "text-gray-600 hover:text-gray-900"}`}>All</Link>
        </li>
        {categories.map((c: any) => (
          <li key={c.id}>
            <Link href={buildUrl({ category: c.slug })} className={`text-sm ${filterState.category === c.slug ? "text-blue-900 font-bold" : "text-gray-600 hover:text-gray-900"}`}>
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
      
      <h3 className="font-bold text-gray-900 mb-4">Availability</h3>
      <ul className="space-y-2 mb-6">
        <li><Link href={buildUrl({ availability: '' })} className={`text-sm ${!filterState.availability ? "text-blue-900 font-bold" : "text-gray-600 hover:text-gray-900"}`}>All</Link></li>
        <li><Link href={buildUrl({ availability: 'in_stock' })} className={`text-sm ${filterState.availability === 'in_stock' ? "text-blue-900 font-bold" : "text-gray-600 hover:text-gray-900"}`}>In Stock</Link></li>
        <li><Link href={buildUrl({ availability: 'out_of_stock' })} className={`text-sm ${filterState.availability === 'out_of_stock' ? "text-blue-900 font-bold" : "text-gray-600 hover:text-gray-900"}`}>Out of Stock</Link></li>
      </ul>

      <h3 className="font-bold text-gray-900 mb-4">Price Range</h3>
      <form action="/products" method="GET" className="space-y-3">
        {/* Preserve existing params */}
        {Object.entries(filterState).map(([key, value]) => (
          (key !== 'minPrice' && key !== 'maxPrice' && value) ? (
            <input key={key} type="hidden" name={key} value={value as string} />
          ) : null
        ))}
        <div className="flex gap-2">
          <input type="number" name="minPrice" placeholder="Min" defaultValue={filterState.minPrice} className="w-full border border-gray-300 rounded p-2 text-sm" />
          <input type="number" name="maxPrice" placeholder="Max" defaultValue={filterState.maxPrice} className="w-full border border-gray-300 rounded p-2 text-sm" />
        </div>
        <button type="submit" className="w-full bg-blue-900 text-white rounded p-2 text-sm font-semibold hover:bg-blue-800">Apply</button>
      </form>
    </div>
  )

  return mobile ? (
    <details className="md:hidden">
      <summary className="bg-white border border-gray-200 px-4 py-2 rounded-lg font-semibold cursor-pointer">Filters</summary>
      <div className="mt-2">{content}</div>
    </details>
  ) : content
}
