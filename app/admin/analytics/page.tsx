import { getPrisma } from "@/lib/prisma"

export default async function AnalyticsPage() {
  const prisma = getPrisma()

  const totalProducts = await prisma.product.count()
  const totalOrders = await prisma.order.count()
  const totalCustomers = await prisma.customer.count()

  const orders = await prisma.order.findMany({
    select: {
      grand_total: true,
    },
  })

  const totalRevenue = orders.reduce(
    (sum: number, order: any) => sum + Number(order.grand_total),
    0
  )

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-900 mb-10">
          Analytics Dashboard
        </h1>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white rounded-3xl shadow-lg p-8">
            <p className="text-gray-500">Products</p>
            <h2 className="text-5xl font-bold text-blue-900 mt-4">
              {totalProducts || 0}
            </h2>
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-8">
            <p className="text-gray-500">Customers</p>
            <h2 className="text-5xl font-bold text-blue-900 mt-4">
              {totalCustomers}
            </h2>
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-8">
            <p className="text-gray-500">Orders</p>
            <h2 className="text-5xl font-bold text-blue-900 mt-4">
              {totalOrders || 0}
            </h2>
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-8">
            <p className="text-gray-500">Revenue</p>
            <h2 className="text-5xl font-bold text-green-700 mt-4">
              ${totalRevenue.toFixed(2)}
            </h2>
          </div>
        </div>
      </div>
    </main>
  )
}

