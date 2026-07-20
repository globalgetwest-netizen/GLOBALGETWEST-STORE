import { supabase } from "@/lib/supabase"
import Link from "next/link"
import AddToCartButton from "@/components/AddToCartButton"

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {

  const { id } = await params

  const { data: product } = await supabase
    .from("products")
    .select(`
      *,
      categories(name)
    `)
    .eq("id", Number(id))
    .single()

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

  const { data: relatedProducts } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", product.category_id)
    .neq("id", product.id)
    .limit(4)

  return (

    <main className="min-h-screen bg-gray-100">

      <div className="max-w-7xl mx-auto px-8 py-12">

        <div className="grid lg:grid-cols-2 gap-12 bg-white rounded-3xl shadow p-10">

          <div>

            <img
              src={product.image || "/placeholder.png"}
              alt={product.name}
              className="w-full rounded-3xl shadow-lg"
            />

          </div>

          <div>

            <p className="text-blue-700 font-semibold mb-2">
              {product.categories?.name || "General"}
            </p>

            <h1 className="text-5xl font-bold text-blue-900">
              {product.name}
            </h1>

            <div className="text-yellow-500 text-2xl mt-4">
              ★★★★★
            </div>

            <h2 className="text-4xl font-bold text-green-700 mt-6">
              ${product.price}
            </h2>

            <p className="text-gray-700 leading-8 mt-8">
              {product.description}
            </p>

            {/* STOCK STATUS */}

            <div className="mt-6">

              {product.stock_quantity > 10 && (

                <span className="bg-green-100 text-green-700 px-5 py-2 rounded-full font-bold">
                  ✅ In Stock ({product.stock_quantity})
                </span>

              )}

              {product.stock_quantity > 0 &&
                product.stock_quantity <= 10 && (

                <span className="bg-yellow-100 text-yellow-700 px-5 py-2 rounded-full font-bold">
                  ⚠️ Low Stock ({product.stock_quantity} left)
                </span>

              )}

              {product.stock_quantity <= 0 && (

                <span className="bg-red-100 text-red-700 px-5 py-2 rounded-full font-bold">
                  ❌ Out of Stock
                </span>

              )}

            </div>

            <div className="flex gap-5 mt-10">

              {product.stock_quantity > 0 ? (

                <a
                  href={product.payment_link}
                  target="_blank"
                  className="bg-yellow-400 px-10 py-4 rounded-xl font-bold"
                >
                  Buy Now
                </a>

              ) : (

                <button
                  disabled
                  className="bg-gray-300 text-gray-600 px-10 py-4 rounded-xl font-bold cursor-not-allowed"
                >
                  Out of Stock
                </button>

              )}

              {product.stock_quantity > 0 ? (

                <AddToCartButton
                  productId={product.id}
                />

              ) : (

                <button
                  disabled
                  className="bg-gray-400 text-white px-10 py-4 rounded-xl font-bold cursor-not-allowed"
                >
                  Add To Cart
                </button>

              )}

            </div>

          </div>

        </div>

        <div className="mt-20">

          <h2 className="text-3xl font-bold text-blue-900 mb-8">
            Related Products
          </h2>

          <div className="grid md:grid-cols-4 gap-6">

            {relatedProducts?.map((item) => (

              <Link
                key={item.id}
                href={`/product/${item.id}`}
                className="bg-white rounded-2xl shadow overflow-hidden hover:shadow-xl transition"
              >

                <img
                  src={item.image || "/placeholder.png"}
                  alt={item.name}
                  className="w-full h-52 object-cover"
                />

                <div className="p-5">

                  <h3 className="font-bold text-blue-900">
                    {item.name}
                  </h3>

                  <p className="text-green-700 font-bold mt-2">
                    ${item.price}
                  </p>

                </div>

              </Link>

            ))}

          </div>

        </div>

      </div>

    </main>

  )

}