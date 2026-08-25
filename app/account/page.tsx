import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";

export default async function AccountPage() {
  const user = await currentUser();

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-10 rounded-3xl shadow-xl text-center">
          <h1 className="text-3xl font-bold text-red-600">Please Login</h1>
          <Link
            href="/auth/login"
            className="inline-block mt-8 bg-blue-900 text-white px-8 py-3 rounded-xl"
          >
            Login
          </Link>
        </div>
      </main>
    );
  }

  const email = user.emailAddresses[0]?.emailAddress;
  const prisma = getPrisma();

  // Find customer in database by email
  const customer = await prisma.customer.findUnique({
    where: { email: email },
  });

  let orders = [];
  let cartItems = [];

  if (customer) {
    orders = await prisma.order.findMany({
      where: { customer_id: customer.id },
      include: {
        items: {
          include: {
            product: {
              include: { images: true },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const cart = await prisma.cart.findFirst({
      where: { customer_id: customer.id },
      include: { items: true },
    });
    cartItems = cart?.items || [];
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto px-8 py-12">
        <h1 className="text-5xl font-bold text-blue-900 mb-10">My Account</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile */}
          <div className="bg-white rounded-3xl shadow p-8">
            <div className="w-28 h-28 rounded-full bg-blue-900 text-white flex items-center justify-center text-4xl font-bold mx-auto">
              {email?.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-bold text-center mt-5">{email}</h2>
            <p className="text-center text-gray-500">Customer</p>
          </div>

          {/* Dashboard */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow p-8">
              <h2 className="text-2xl font-bold text-blue-900">Dashboard</h2>
              <div className="grid md:grid-cols-3 gap-5 mt-8">
                <div className="bg-gray-100 p-6 rounded-2xl">
                  <p>Orders</p>
                  <h3 className="text-4xl font-bold">{orders.length}</h3>
                </div>
                <div className="bg-gray-100 p-6 rounded-2xl">
                  <p>Cart Items</p>
                  <h3 className="text-4xl font-bold">{cartItems.length}</h3>
                </div>
                <div className="bg-gray-100 p-6 rounded-2xl">
                  <p>Wishlist</p>
                  <h3 className="text-4xl font-bold">0</h3>
                </div>
              </div>
            </div>

            {/* Order History */}
            <div className="bg-white rounded-3xl shadow p-8 mt-8">
              <h2 className="text-3xl font-bold text-blue-900 mb-8">My Orders</h2>
              {orders.length > 0 ? (
                orders.map((order: any) => (
                  <div key={order.id} className="border rounded-2xl p-6 mb-5">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-bold">Order #{order.id}</h3>
                        <p className="text-gray-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-700">
                          ${order.grand_total.toString()}
                        </p>
                        <p>{order.payment_status || "Processing"}</p>
                      </div>
                    </div>
                    <div className="mt-5 space-y-3">
                      {order.items.map((item: any) => (
                        <div key={item.product_name} className="flex items-center gap-4">
                          {/* Assuming item.product.images[0] exists */}
                          <img
                            src={
                              item.product.images[0]
                                ? `https://${process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN}/${item.product.images[0].image_key}`
                                : "/placeholder.png"
                            }
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div>
                            <p className="font-bold">{item.product_name}</p>
                            <p>Qty: {item.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No orders yet.</p>
              )}
            </div>
            {/* Quick Links */}
            <div className="bg-white rounded-3xl shadow p-8 mt-8">
              <h2 className="text-2xl font-bold text-blue-900">Quick Links</h2>
              <div className="flex gap-4 mt-5">
                <Link
                  href="/cart"
                  className="bg-blue-900 text-white px-6 py-3 rounded-xl"
                >
                  My Cart
                </Link>
                <Link
                  href="/"
                  className="bg-yellow-400 px-6 py-3 rounded-xl font-bold"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}


