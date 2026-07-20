import { supabase } from "@/lib/supabase"

export default async function Home() {
  const { data: products } = await supabase
    .from("products")
    .select(`
      *,
      categories(
        name
      )
    `)
    .order("created_at", { ascending: false })

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <main className="min-h-screen bg-white">

      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-5 border-b">

        <h1 className="text-3xl font-bold text-blue-900">
          GLOBALGETWEST
        </h1>

        <div className="hidden md:flex gap-6 text-gray-700">
          <span>Home</span>
          <span>Products</span>
          <span>Categories</span>
          <span>Contact</span>
        </div>

        <a
          href="/cart"
          className="bg-blue-900 text-white px-5 py-2 rounded-lg"
        >
          Cart
        </a>

      </nav>

      {/* Hero */}

      <section className="bg-gradient-to-r from-blue-950 via-blue-800 to-blue-600 text-white px-10 py-24">

        <div className="max-w-6xl mx-auto text-center">

          <h2 className="text-5xl md:text-6xl font-bold leading-tight">
            Your Global Marketplace
            <br />
            For Premium Natural Products
          </h2>

          <p className="mt-6 text-lg max-w-3xl mx-auto text-blue-100">
            Discover trusted wellness products from GLOBALGETWEST.
            Simple shopping, secure payment and worldwide access.
          </p>

          <div className="mt-10 flex justify-center gap-5">

            <button className="bg-yellow-400 text-black px-10 py-4 rounded-full font-bold">
              Shop Now
            </button>

            <button className="border border-white px-10 py-4 rounded-full">
              Explore Categories
            </button>

          </div>

          {/* Search */}

          <form
            action="/search"
            className="mt-14 bg-white rounded-2xl p-3 flex max-w-4xl mx-auto"
          >

            <input
              type="text"
              name="q"
              className="flex-1 px-6 py-4 text-black outline-none"
              placeholder="Search products, categories and collections..."
            />

            <button
              type="submit"
              className="bg-blue-900 text-white px-10 rounded-xl"
            >
              Search
            </button>

          </form>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-14 text-sm">

            <div>✓ Verified Products</div>
            <div>✓ Secure Payments</div>
            <div>✓ Worldwide Delivery</div>
            <div>✓ Customer Support</div>

          </div>

        </div>

      </section>

      {/* Categories */}

      <section className="px-10 py-12">

        <h2 className="text-3xl font-bold text-blue-900 mb-8">
          Explore Categories
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">

          {categories?.map((category) => (

            <div
              key={category.id}
              className="border rounded-2xl overflow-hidden shadow hover:shadow-xl transition"
            >

              <img
                src={category.image || "/placeholder.png"}
                alt={category.name}
                className="w-full h-32 object-cover"
              />

              <div className="p-5 text-center">

                <h3 className="font-bold text-blue-900">
                  {category.name}
                </h3>

              </div>

            </div>

          ))}

        </div>

      </section>

      {/* Products */}

      <section className="px-10 py-12 bg-gray-50">

        <h2 className="text-3xl font-bold text-blue-900 mb-8">
          Featured Products
        </h2>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">

          {products?.map((product) => (

            <a
              href={`/product/${product.id}`}
              key={product.id}
              className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition overflow-hidden block"
            >

              <div className="relative">

                <img
                  src={product.image || "/placeholder.png"}
                  alt={product.name}
                  className="w-full h-52 object-cover"
                />

                <span className="absolute top-3 left-3 bg-yellow-400 text-black px-4 py-2 rounded-full text-xs font-bold">
                  ⭐ Featured
                </span>

              </div>

              <div className="p-5">

                <h3 className="text-xl font-bold text-blue-900">
                  {product.name}
                </h3>

                <p className="text-blue-700 text-sm mt-2">
                  Category: {product.categories?.name || "General"}
                </p>

                <p className="text-gray-600 mt-2 text-sm">
                  {product.description}
                </p>

                <div className="text-yellow-500 mt-3">
                  ★★★★★
                </div>

                <p className="text-blue-900 font-bold text-2xl mt-3">
                  ${product.price}
                </p>

                <p className="text-green-600 text-sm mt-2">
                  ✓ Available | Worldwide Delivery
                </p>

                <div className="mt-5 bg-yellow-400 text-center py-3 rounded-lg font-semibold">
                  View Product
                </div>

              </div>

            </a>

          ))}

        </div>

      </section>

      {/* Trust */}

      <section className="px-10 py-12 grid md:grid-cols-4 gap-5 text-center">

        <div>✓ Secure Payments</div>
        <div>✓ Verified Products</div>
        <div>✓ Worldwide Delivery</div>
        <div>✓ Customer Support</div>

      </section>

      {/* Footer */}

      <footer className="bg-blue-900 text-white text-center py-8">
        © 2026 GLOBALGETWEST. All rights reserved.
      </footer>

    </main>
  )
}