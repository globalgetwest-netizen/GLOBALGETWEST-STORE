import { getPrisma } from "@/lib/prisma"
import OrderStatus from "@/components/OrderStatus"

export default async function OrdersPage() {
  const prisma = getPrisma()

  const orders = await prisma.order.findMany({
    orderBy: { created_at: "desc" },
  })

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold text-blue-900 mb-10">
        Orders Management
      </h1>

      <div className="bg-white rounded-3xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="p-5 text-left">Order ID</th>
              <th className="p-5 text-left">Customer ID</th>
              <th className="p-5 text-left">Amount</th>
              <th className="p-5 text-left">Status</th>
              <th className="p-5 text-left">Payment</th>
              <th className="p-5 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order: any) => (
              <tr key={order.id} className="border-b">
                <td className="p-5 font-bold">#{order.id.slice(0, 8)}...</td>
                <td className="p-5 text-sm break-all">{order.customer_id}</td>
                <td className="p-5 text-green-700 font-bold">
                  ${order.grand_total.toString()}
                </td>
                <td className="p-5">
                  <OrderStatus
                    orderId={order.id}
                    currentStatus={order.fulfillment_status}
                  />
                </td>
                <td className="p-5">
                  <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full">
                    {order.payment_status}
                  </span>
                </td>
                <td className="p-5">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}

