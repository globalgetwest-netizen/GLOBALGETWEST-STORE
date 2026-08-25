import Link from "next/link"
import { getPrisma } from "@/lib/prisma"
import { getR2ObjectUrl } from "@/lib/media"
import CurrencySelector from "@/components/CurrencySelector"
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"

export default async function Home() {
  const prisma = getPrisma()
  const { userId } = await auth()
  
  const products = await prisma.product.findMany({
    where: {
      published_state: "published",
      status: "active",
    },
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
    orderBy: {
      created_at: "desc",
    },
    take: 20,
  })

  const categories = await prisma.category.findMany({
    where: {
      is_active: true,
    },
    orderBy: {
      created_at: "desc",
    },
  })

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-200">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          GLOBALGETWEST
        </h1>

        <div className="hidden md:flex gap-8 text-sm uppercase tracking-widest text-gray-600">
          <span className="hover:text-blue-900 cursor-pointer transition-colors">Home</span>
          <span className="hover:text-blue-900 cursor-pointer transition-colors">Products</span>
          <span className="hover:text-blue-900 cursor-pointer transition-colors">Categories</span>
          <span className="hover:text-blue-900 cursor-pointer transition-colors">Contact</span>
        </div>

        <div className="flex items-center gap-4">
          <CurrencySelector />
          {userId ? (
            <UserButton />
          ) : (
            <>
              <SignInButton mode="modal" />
              <SignUpButton mode="modal" />
            </>
          )}
          <a
            href="/cart"
            className="bg-gray-900 text-white px-5 py-2 rounded font-semibold hover:bg-gray-700 transition-colors"
          >
            Cart
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-white text-gray-900 px-10 py-24">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight">
            Premium Global Marketplace
            <br />
            <span className="text-blue-900">For Natural Wellness Products</span>
          </h2>

          <p className="mt-8 text-xl max-w-2xl mx-auto text-gray-600">
            Discover trusted, ethically sourced wellness products.
            Simple shopping, secure payment, and worldwide access.
          </p>

          <div className="mt-12 flex justify-center gap-5">
            <button className="bg-blue-900 text-white px-10 py-4 rounded font-bold hover:bg-blue-800 transition-colors tracking-wide">
              Shop Now
            </button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 tracking-tight">Browse Categories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((category: any) => (
              <div
                key={category.id}
                className="bg-white rounded-lg overflow-hidden border border-gray-200 hover:border-blue-900 transition-all shadow-sm hover:shadow-md"
              >
                {category.image_key ? (
                  <img
                    src={getR2ObjectUrl(category.image_key)}
                    alt={category.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400">{category.name}</span>
                  </div>
                )}
                <div className="p-6">
                  <h3 className="font-semibold text-gray-900 text-lg">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mt-2">
                      {category.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 tracking-tight">Featured Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product: any) => (
              <div
                key={product.id}
                className="bg-white rounded-lg overflow-hidden border border-gray-200 hover:border-blue-900 transition-all shadow-sm hover:shadow-md"
              >
                {product.images?.[0]?.image_key ? (
                  <img
                    src={getR2ObjectUrl(product.images[0].image_key)}
                    alt={product.name}
                    className="w-full h-64 object-cover"
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400">No Image</span>
                  </div>
                )}
                <div className="p-6">
                  <h3 className="font-semibold text-gray-900 text-lg truncate">{product.name}</h3>
                  {product.short_description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mt-2 h-10">
                      {product.short_description}
                    </p>
                  )}
                  <div className="flex justify-between items-center mt-6">
                    <span className="text-2xl font-bold text-gray-900">
                      GH₵{product.base_price}
                    </span>
                    {product.compare_at_price && product.compare_at_price > product.base_price ? (
                      <span className="text-sm text-gray-400 line-through">
                        GH₵{product.compare_at_price}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-6">
                    <Link
                      href={`/product/${product.slug}`}
                      className="block w-full border border-gray-900 text-gray-900 py-3 rounded font-bold text-center hover:bg-gray-900 hover:text-white transition-colors"
                    >
                      View Product
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 tracking-tight">Quality You Can Trust</h2>
          <p className="text-lg max-w-2xl mx-auto text-gray-300">
            We source only the finest natural ingredients and rigorously test
            every product to ensure purity, potency, and safety. Your wellness
            journey deserves nothing less.
          </p>
          <a href="/products" className="mt-10 inline-block bg-white text-gray-900 px-10 py-4 rounded font-bold hover:bg-gray-200 transition-colors tracking-wide">
            Browse All Products
          </a>
        </div>
      </section>
    </main>
  )
}
