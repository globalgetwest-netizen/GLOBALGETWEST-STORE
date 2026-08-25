import Link from "next/link"
import { getPrisma } from "@/lib/prisma"
import { getR2ObjectUrl } from "@/lib/media"
import ProductFilters from "@/components/ProductFilters"
import SortSelect from "@/components/SortSelect"

const PAGE_SIZE = 12

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  GHS: "GH₵",
  GBP: "£",
  EUR: "€",
}

function formatMoney(amount: number | string, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `
  return `${symbol}${Number(amount).toFixed(2)}`
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    category?: string
    sort?: string
    availability?: string
    minPrice?: string
    maxPrice?: string
    page?: string
  }>
}) {
  let params: any
  try {
    params = await searchParams
  } catch {
    params = {}
  }

  const query = (params.q || "").toString().trim()
  const categorySlug = params.category?.toString()
  const sort = (params.sort || "newest").toString()
  const availability = params.availability?.toString()
  const minPriceRaw = params.minPrice?.toString()
  const maxPriceRaw = params.maxPrice?.toString()
  const page = Math.max(1, parseInt(params.page?.toString() || "1", 10) || 1)

  const prisma = getPrisma()

  // Build the dynamic where clause from real, supported attributes.
  const where: any = {
    published_state: "published",
    status: "active",
  }

  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { short_description: { contains: query, mode: "insensitive" } },
      { full_description: { contains: query, mode: "insensitive" } },
      { brand: { contains: query, mode: "insensitive" } },
    ]
  }

  if (categorySlug) {
    where.category = { slug: categorySlug }
  }

  if (minPriceRaw && !isNaN(parseFloat(minPriceRaw))) {
    where.base_price = { ...(where.base_price || {}), gte: parseFloat(minPriceRaw) }
  }
  if (maxPriceRaw && !isNaN(parseFloat(maxPriceRaw))) {
    where.base_price = { ...(where.base_price || {}), lte: parseFloat(maxPriceRaw) }
  }

  if (availability === "in_stock") {
    where.stock_quantity = { gt: 0 }
  } else if (availability === "out_of_stock") {
    where.stock_quantity = { lte: 0 }
  }

  const orderBy: any = {}
  if (sort === "price-asc") {
    orderBy.base_price = "asc"
  } else if (sort === "price-desc") {
    orderBy.base_price = "desc"
  } else if (sort === "name-asc") {
    orderBy.name = "asc"
  } else {
    orderBy.created_at = "desc"
  }

  try {
    const [categories, total, products] = await Promise.all([
      prisma.category.findMany({
        where: { is_active: true },
        orderBy: { sort_order: "asc" },
        select: { id: true, name: true, slug: true },
      }),
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: { select: { name: true } },
          images: { select: { image_key: true }, take: 1 },
          reviews: { select: { rating: true } },
        },
        orderBy,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ])

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const activeCategory = categories.find((c: any) => c.slug === categorySlug)

    const filterState = {
      q: query,
      category: categorySlug || "",
      sort,
      availability: availability || "",
      minPrice: minPriceRaw || "",
      maxPrice: maxPriceRaw || "",
      page: page.toString(),
    }

    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="container mx-auto px-4">
          {/* Breadcrumbs */}
          <nav className="text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-blue-900">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/products" className="hover:text-blue-900">Products</Link>
            {activeCategory && (
              <>
                <span className="mx-2">/</span>
                <span className="text-gray-900 font-medium">{activeCategory.name}</span>
              </>
            )}
          </nav>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900 mb-1">
                {query ? "Search Results" : activeCategory ? activeCategory.name : "All Products"}
              </h1>
              {query && (
                <p className="text-gray-500 mb-1">
                  Showing results for <span className="font-semibold text-gray-700">&ldquo;{query}&rdquo;</span>
                </p>
              )}
              <p className="text-gray-500">
                {total} {total === 1 ? "product" : "products"} available
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-sm text-gray-600">Sort by:</label>
              <SortSelect defaultValue={sort} />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Desktop Filter Sidebar */}
            <aside className="hidden md:block w-64 flex-shrink-0">
              <ProductFilters categories={categories} filterState={filterState} />
            </aside>

            {/* Product Grid */}
            <div className="flex-1">
              {/* Mobile Filter Trigger */}
              <div className="md:hidden mb-4">
                <ProductFilters categories={categories} filterState={filterState} mobile />
              </div>

              {products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product: any) => {
                    const inStock = product.stock_quantity > 0
                    const lowStock =
                      inStock &&
                      product.stock_quantity <= (product.low_stock_threshold ?? 5)
                    const hasDiscount =
                      product.compare_at_price &&
                      Number(product.compare_at_price) > Number(product.base_price)
                    const reviewCount = product.reviews?.length || 0
                    const avgRating = reviewCount
                      ? product.reviews.reduce(
                          (sum: number, r: any) => sum + r.rating,
                          0
                        ) / reviewCount
                      : 0

                    return (
                      <div
                        key={product.id}
                        className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-blue-900 transition-all shadow-sm hover:shadow-md flex flex-col"
                      >
                        <Link href={`/product/${product.slug}`} className="block relative">
                          {product.images?.[0]?.image_key ? (
                            <img
                              src={getR2ObjectUrl(product.images[0].image_key)}
                              alt={product.name}
                              className="w-full h-60 object-cover group-hover:scale-[1.02] transition-transform"
                            />
                          ) : (
                            <div className="w-full h-60 bg-gray-100 flex items-center justify-center">
                              <span className="text-gray-400">No Image</span>
                            </div>
                          )}
                          {hasDiscount && (
                            <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                              SALE
                            </span>
                          )}
                          {!inStock && (
                            <span className="absolute top-3 right-3 bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded">
                              Out of Stock
                            </span>
                          )}
                        </Link>

                        <div className="p-5 flex flex-col flex-1">
                          {product.category?.name && (
                            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                              {product.category.name}
                            </p>
                          )}
                          <Link href={`/product/${product.slug}`} className="block">
                            <h2 className="text-base font-semibold text-gray-900 hover:text-blue-900 line-clamp-2 leading-snug">
                              {product.name}
                            </h2>
                          </Link>

                          {reviewCount > 0 && (
                            <div className="flex items-center gap-1 mt-2 text-sm">
                              <span className="text-amber-400">{"★".repeat(Math.round(avgRating))}</span>
                              <span className="text-gray-400">({reviewCount})</span>
                            </div>
                          )}

                          <div className="mt-auto pt-4">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-bold text-gray-900">
                                {formatMoney(product.base_price, product.currency || "GHS")}
                              </span>
                              {hasDiscount && (
                                <span className="text-sm text-gray-400 line-through">
                                  {formatMoney(product.compare_at_price, product.currency || "GHS")}
                                </span>
                              )}
                            </div>

                            <div className="mt-2">
                              {inStock ? (
                                lowStock ? (
                                  <span className="inline-block text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                                    Only {product.stock_quantity} left
                                  </span>
                                ) : (
                                  <span className="inline-block text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded">
                                    In Stock
                                  </span>
                                )
                              ) : (
                                <span className="inline-block text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded">
                                  Out of Stock
                                </span>
                              )}
                            </div>

                            <Link
                              href={`/product/${product.slug}`}
                              className="mt-4 block w-full text-center bg-blue-900 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-800 transition-colors"
                            >
                              View Product
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
                  <p className="text-gray-900 font-medium text-lg mb-2">No products found</p>
                  <p className="text-gray-500 mb-6">
                    We couldn&apos;t find any products matching your current filters.
                  </p>
                  <Link
                    href="/products"
                    className="inline-block bg-blue-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors"
                  >
                    Clear all filters
                  </Link>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-10 flex justify-center items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                    const sp = new URLSearchParams()
                    if (query) sp.set("q", query)
                    if (categorySlug) sp.set("category", categorySlug)
                    if (sort !== "newest") sp.set("sort", sort)
                    if (availability) sp.set("availability", availability)
                    if (minPriceRaw) sp.set("minPrice", minPriceRaw)
                    if (maxPriceRaw) sp.set("maxPrice", maxPriceRaw)
                    sp.set("page", p.toString())
                    const href = p === 1 && !query && !categorySlug && sort === "newest" && !availability && !minPriceRaw && !maxPriceRaw
                      ? "/products"
                      : `/products?${sp.toString()}`
                    return (
                      <Link
                        key={p}
                        href={href}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
                          p === page
                            ? "bg-blue-900 text-white border-blue-900"
                            : "bg-white text-gray-700 border-gray-300 hover:border-blue-900"
                        }`}
                      >
                        {p}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  } catch (err) {
    return (
      <div className="min-h-screen bg-gray-50 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Something went wrong</h1>
          <p className="text-gray-500 mb-8">
            We were unable to load the product catalog. Please try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-block bg-blue-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }
}
