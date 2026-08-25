import Link from "next/link"
import { getPrisma } from "@/lib/prisma"
import { getR2ObjectUrl } from "@/lib/media"
import { deleteProductAction } from "./actions"

export default async function ProductsPage() {
  const prisma = getPrisma()
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      base_price: true,
      created_at: true,
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
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-blue-900">
          Products
        </h1>
        <a
          href="/admin/products/new"
          className="bg-blue-900 text-white px-6 py-3 rounded-xl font-bold"
        >
          + Add Product
        </a>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Image</th>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Category</th>
              <th className="p-4 text-left">Price</th>
              <th className="p-4 text-left">Created</th>
              <th className="p-4 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product: any) => (
              <tr
                key={product.id}
                className="border-t"
              >
                <td className="p-4">
                  {product.images?.[0]?.image_key ? (
                    <img
                      src={getR2ObjectUrl(product.images[0].image_key)}
                      alt={product.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500">No Image</span>
                    </div>
                  )}
                </td>
                <td className="p-4 font-bold">{product.name}</td>
                <td className="p-4">
                  <span className="bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-sm">
                    {product.category?.name || "No Category"}
                  </span>
                </td>
                <td className="p-4 font-bold text-blue-900">
                  {product.base_price.toString()}
                </td>
                <td className="p-4">
                  {new Date(product.created_at).toLocaleDateString()}
                </td>
                <td className="p-4 flex gap-3">
                  <a
                    href={`/admin/products/edit/${product.id}`}
                    className="bg-yellow-400 px-4 py-2 rounded-lg"
                  >
                    Edit
                  </a>
                  <form action={deleteProductAction}>
                    <input type="hidden" name="id" value={product.id} />
                    <button
                      type="submit"
                      className="bg-red-600 text-white px-4 py-2 rounded-lg"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
