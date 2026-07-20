import { supabase } from "@/lib/supabase"

export default async function AdminDashboard() {
  const { data: products } = await supabase
    .from("products")
    .select("*")

  const totalProducts = products?.length || 0

  return (
    <div>

      <h1 className="text-4xl font-bold text-blue-900 mb-8">
        Dashboard
      </h1>

      {/* Statistics */}
      <div className="grid md:grid-cols-4 gap-6">

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-gray-500">Products</p>
          <h2 className="text-4xl font-bold text-blue-900">
            {totalProducts}
          </h2>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-gray-500">Orders</p>
          <h2 className="text-4xl font-bold text-green-600">
            0
          </h2>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-gray-500">Customers</p>
          <h2 className="text-4xl font-bold text-purple-600">
            0
          </h2>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-gray-500">Revenue</p>
          <h2 className="text-4xl font-bold text-yellow-500">
            $0
          </h2>
        </div>

      </div>

      {/* Quick Actions */}
      <div className="mt-10 bg-white rounded-2xl shadow p-8">

        <h2 className="text-2xl font-bold mb-6">
          Quick Actions
        </h2>

        <div className="flex flex-wrap gap-4">

          <a
            href="/admin/products"
            className="bg-blue-900 text-white px-6 py-3 rounded-xl"
          >
            📦 Manage Products
          </a>

          <a
            href="/admin/products/new"
            className="bg-green-600 text-white px-6 py-3 rounded-xl"
          >
            ➕ Add Product
          </a>

          <a
            href="/"
            className="bg-gray-700 text-white px-6 py-3 rounded-xl"
          >
            🌐 View Store
          </a>

        </div>

      </div>

      {/* Recent Products */}
      <div className="mt-10 bg-white rounded-2xl shadow p-8">

        <h2 className="text-2xl font-bold mb-6">
          Recent Products
        </h2>

        <table className="w-full">

          <thead>

            <tr className="border-b">

              <th className="text-left py-3">Product</th>
              <th className="text-left py-3">Price</th>

            </tr>

          </thead>

          <tbody>

            {products?.map((product) => (

              <tr key={product.id} className="border-b">

                <td className="py-4">
                  {product.name}
                </td>

                <td>
                  ${product.price}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  )
}