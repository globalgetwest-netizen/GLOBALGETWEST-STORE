import Link from "next/link"
import { getPrisma } from "@/lib/prisma"
import { getR2ObjectUrl } from "@/lib/media"
import AddToCartButton from "@/components/AddToCartButton"

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const prisma = getPrisma()
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          name: true,
        },
      },
      images: {
        select: {
          image_key: true,
        },
        take: 1,
      },
    },
  })

  if (!product) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-600">
            Product Not Found
          </h1>
          <Link
            href="/"
            className="mt-6 inline-block bg-blue-900 text-white px-8 py-3 rounded-xl"
          >
            Back Home
          </Link>
        </div>
      </main>
    )
  }

  const relatedProducts = await prisma.product.findMany({
    where: {
      category_id: product.category_id,
      id: {
        not: product.id,
      },
      published_state: "published",
      status: "active",
    },
    take: 4,
    orderBy: {
      created_at: "desc",
    },
    include: {
      images: {
        select: {
          image_key: true,
        },
        take: 1,
      },
    },
  })

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-12 bg-white rounded-3xl shadow p-10">
          <div>
            <img
              src={product.images?.[0]?.image_key ? getR2ObjectUrl(product.images[0].image_key) : "/placeholder.png"}
              alt={product.name}
              className="w-full rounded-3xl shadow-lg"
            />
          </div>

          <div>
            <p className="text-blue-700 font-semibold mb-2">
              {product.category?.name || "General"}
            </p>

            <h1 className="text-5xl font-bold text-blue-900">
              {product.name}
            </h1>

            <div className="text-yellow-500 text-2xl mt-4">
              â˜…â˜…â˜…â˜…â˜…
            </div>

            <h2 className="text-4xl font-bold text-green-700 mt-6">
              GHâ‚µ{product.base_price}
            </h2>

            <p className="text-gray-700 leading-8 mt-8">
              {product.full_description || product.short_description || ""}
            </p>

            {/* STOCK STATUS */}
            <div className="mt-6">
              {product.stock_quantity > 10 && (
                <span className="bg-green-100 text-green-700 px-5 py-2 rounded-full font-bold">
                  âœ… In Stock ({product.stock_quantity})
                </span>
              )}

              {product.stock_quantity > 0 &&
                product.stock_quantity <= 10 && (
                  <span className="bg-yellow-100 text-yellow-700 px-5 py-2 rounded-full font-bold">
                    âš ï¸ Low Stock ({product.stock_quantity} left)
                  </span>
                )}

              {product.stock_quantity <= 0 && (
                <span className="bg-red-100 text-red-700 px-5 py-2 rounded-full font-bold">
                  âŒ Out of Stock
                </span>
              )}
            </div>

            <AddToCartButton productId={product.id} />

            <div className="mt-6">
              <Link
                href="/"
                className="text-blue-600 hover:underline"
              >
                â† Back to Home
              </Link>
            </div>
          </div>
        </div>

        {/* Related Products */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-center mb-8">
            You May Also Like
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedProducts.map((relatedProduct: any) => (
              <div
                key={relatedProduct.id}
                className="bg-white rounded-lg overflow-hidden shadow hover:shadow-md transition-shadow"
              >
                {relatedProduct.images?.[0]?.image_key ? (
                  <img
                    src={getR2ObjectUrl(relatedProduct.images[0].image_key)}
                    alt={relatedProduct.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500">No Image</span>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800">{relatedProduct.name}</h3>
                  {relatedProduct.short_description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {relatedProduct.short_description}
                    </p>
                  )}
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-lg font-bold text-green-600">
                      GHâ‚µ{relatedProduct.base_price}
                    </span>
                    {relatedProduct.compare_at_price && relatedProduct.compare_at_price > relatedProduct.base_price ? (
                      <span className="text-sm text-gray-500 line-through">
                        GHâ‚µ{relatedProduct.compare_at_price}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3">
                    <Link
                      href={`/product/${relatedProduct.slug}`}
                      className="w-full bg-yellow-400 text-black py-2 rounded-full font-bold text-center"
                    >
                      View Product
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

