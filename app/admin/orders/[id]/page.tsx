import { getPrisma } from "@/lib/prisma"
import { getR2ObjectUrl } from "@/lib/media"
import Link from "next/link"
import { notFound } from "next/navigation"
import OrderControls from "@/components/OrderControls"

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const prisma = getPrisma()

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            select: {
              images: {
                take: 1,
                select: { image_key: true }
              }
            }
          }
        }
      },
      shipping_address_details: true
    }
  })

  if (!order) {
    notFound()
  }

  const address = order.shipping_address_details

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <Link
        href="/admin/orders"
        className="bg-blue-900 text-white px-6 py-3 rounded-xl"
      >
        â† Back to Orders
      </Link>

      <OrderControls
        orderId={order.id}
        currentStatus={order.fulfillment_status}
        currentPayment={order.payment_status}
        trackingNumber={order.tracking_number}
      />

      <div className="mt-8 bg-white rounded-3xl shadow p-8">
        <h1 className="text-4xl font-bold text-blue-900">
          Order #{order.id.slice(0, 8)}...
        </h1>

        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div>
            <p className="text-gray-500">Status</p>
            <p className="font-bold">{order.fulfillment_status}</p>
          </div>

          <div>
            <p className="text-gray-500">Payment</p>
            <p className="font-bold">{order.payment_status}</p>
          </div>

          <div>
            <p className="text-gray-500">Total</p>
            <p className="font-bold text-green-700">
              ${order.grand_total.toString()}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 bg-white rounded-3xl shadow p-8">
        <h2 className="text-3xl font-bold text-blue-900 mb-8">
          Shipping Address
        </h2>

        {address ? (
          <div className="space-y-1 text-gray-700">
            <p className="font-bold text-gray-900">
              {address.full_name}
            </p>
            <p>{address.address_line_1}</p>
            {address.address_line_2 ? <p>{address.address_line_2}</p> : null}
            <p>
              {address.city}, {address.state_province} {address.postal_code}
            </p>
            <p>{address.country}</p>
            <p>{address.phone}</p>
            <p>{address.email}</p>
            {address.delivery_instructions ? (
              <p className="mt-4 text-sm text-gray-500">
                <span className="font-semibold">Instructions:</span>{" "}
                {address.delivery_instructions}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-gray-400">No shipping address on file.</p>
        )}
      </div>

      <div className="mt-10 bg-white rounded-3xl shadow p-8">
        <h2 className="text-3xl font-bold text-blue-900 mb-8">Products</h2>

        <div className="space-y-5">
          {order.items.map((item: any) => (
            <div key={item.id} className="flex gap-6 border-b pb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  item.product?.images?.[0]?.image_key
                    ? getR2ObjectUrl(item.product.images[0].image_key)
                    : "/placeholder.png"
                }
                alt={item.product_name}
                className="w-24 h-24 rounded-xl object-cover"
              />

              <div>
                <h3 className="font-bold text-xl">{item.product_name}</h3>
                <p>Quantity: {item.quantity}</p>
                <p className="text-green-700 font-bold">
                  ${item.unit_price.toString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
