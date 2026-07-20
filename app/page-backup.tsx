import { supabase } from "@/lib/supabase"

export default async function Home() {
  const { data: products } = await supabase
    .from("products")
    .select("*")

  return (
    <main className="min-h-screen bg-white">

      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-5 border-b">
        <h1 className="text-3xl font-bold text-blue-900">
          GLOBALGETWEST
        </h1>

        <div className="flex gap-6 text-gray-700">
          <span>Home</span>
          <span>Products</span>
          <span>Categories</span>
          <span>Contact</span>
        </div>

        <button className="bg-blue-900 text-white px-5 py-2 rounded-lg">
          Cart
        </button>
      </nav>


      {/* Hero Section */}
      <section className="bg-blue-900 text-white px-10 py-20 flex flex-col items-center text-center">

        <h2 className="text-5xl font-bold max-w-3xl">
          Your Global Marketplace for Premium Natural Products
        </h2>

        <p className="mt-6 text-lg max-w-2xl">
          Discover quality wellness products with simple shopping,
          secure payment and worldwide access.
        </p>

        <div className="mt-8 flex gap-4">

          <button className="bg-yellow-400 text-black px-8 py-3 rounded-lg font-semibold">
            Shop Now
          </button>

          <button className="border border-white px-8 py-3 rounded-lg">
            Explore Categories
          </button>

        </div>


        {/* Search */}
        <div className="mt-12 bg-white rounded-xl p-2 flex w-full max-w-3xl">

          <input
            className="flex-1 px-5 py-3 text-black outline-none"
            placeholder="Search products, categories and collections..."
          />

          <button className="bg-blue-900 text-white px-8 rounded-lg">
            Search
          </button>

        </div>

      </section>



      {/* Categories */}
      <section className="px-10 py-12">

        <h2 className="text-3xl font-bold text-blue-900 mb-8">
          Explore Categories
        </h2>


        <div className="grid grid-cols-2 md:grid-cols-5 gap-5">

          {[
            "Herbal Products",
            "Wellness Support",
            "Natural Collection",
            "Featured Items",
            "Best Sellers"
          ].map((cat)=>(
            <div
              key={cat}
              className="border rounded-xl p-6 text-center shadow-sm hover:shadow-lg"
            >
              {cat}
            </div>
          ))}

        </div>

      </section>



      {/* Products */}
      <section className="px-10 py-12 bg-gray-50">

        <h2 className="text-3xl font-bold text-blue-900 mb-8">
          Featured Products
        </h2>


        <div className="grid md:grid-cols-4 gap-6">

          {products?.map((product)=>(
            <div
              key={product.id}
              className="bg-white rounded-xl shadow p-5"
            >

              <img
                src={product.image}
                alt={product.name}
                className="w-full h-48 object-cover rounded-lg"
              />


              <h3 className="text-xl font-bold mt-4">
                {product.name}
              </h3>


              <p className="text-gray-600 mt-2">
                {product.description}
              </p>


              <p className="text-blue-900 font-bold text-xl mt-3">
                ${product.price}
              </p>


              <a
                href={product.payment_link}
                className="block text-center bg-yellow-400 mt-4 py-3 rounded-lg font-semibold"
              >
                Buy Now
              </a>

            </div>
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