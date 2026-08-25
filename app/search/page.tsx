import Link from "next/link"
import { getPrisma } from "@/lib/prisma"
import { getR2ObjectUrl } from "@/lib/media"

export default async function SearchPage({
  searchParams,
}: {
  searchParams: {
    q?: string
  }
}) {
  const prisma = getPrisma()
  const query = searchParams.q || ""

  const products = await prisma.product.findMany({
    where: {
      OR: [
        {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          short_description: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          full_description: {
            contains: query,
            mode: "insensitive",
          },
        },
      ],
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
  })

  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <h1 className="text-4xl font-bold text-blue-900 mb-8">
        Search Results
      </h1>

      <p className="mb-6 text-gray-600">
        Results for: <b>{query}</b>
      </p>

      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
        {products.map((product: any) => (
          <a
            key={product.id}
            href={`/product/${product.slug}`}
            className="bg-white rounded-2xl shadow overflow-hidden hover:shadow-xl"
          >
            <img
              src={product.images?.[0]?.image_key ? getR2ObjectUrl(product.images[0].image_key) : "/placeholder.png"}
              alt={product.name}
              className="w-full h-48 object-cover"
            />
            <div className="p-5">
              <h2 className="text-xl font-bold text-blue-900">
                {product.name}
              </h2>

              <p className="text-sm text-blue-700 mt-2">
                {product.category?.name}
              </p>

              <p className="text-2xl font-bold mt-3">
                GHâ‚µ{product.base_price.toString()}
              </p>
            </div>
          </a>
        ))}

        {products.length === 0 && (
          <p>
            No products found.
          </p>
        )}
      </div>
    </div>
  )
}

