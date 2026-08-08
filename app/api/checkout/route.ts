import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import { initializeTransaction } from "@/lib/paystack"

// Creates a pending order from the user's cart, then starts a Paystack
// transaction and returns the hosted checkout URL. Stock is only reduced and
// the cart is only cleared AFTER payment is confirmed (see lib/orders.ts).
export async function POST(req: Request) {
  const admin = getSupabaseAdmin()

  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 400 })
    }

    // Buyer email (required by Paystack).
    const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(userId)
    const email = userRes?.user?.email
    if (userErr || !email) {
      return NextResponse.json({ error: "Could not load your account email" }, { status: 400 })
    }

    // Load the cart with product details.
    const { data: carts, error: cartError } = await admin
      .from("carts")
      .select("id, quantity, products(id, name, price, stock_quantity)")
      .eq("user_id", userId)

    if (cartError || !carts || carts.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
    }

    const line = (item: any) => (Array.isArray(item.products) ? item.products[0] : item.products)

    // Stock check.
    for (const item of carts) {
      const product = line(item)
      if (!product) continue
      if (Number(product.stock_quantity) < Number(item.quantity)) {
        return NextResponse.json({ error: `${product.name} is out of stock` }, { status: 400 })
      }
    }

    // Total (GHS).
    const total = carts.reduce((sum: number, item: any) => {
      const product = line(item)
      return sum + Number(product.price) * Number(item.quantity)
    }, 0)

    if (total <= 0) {
      return NextResponse.json({ error: "Order total must be greater than zero" }, { status: 400 })
    }

    const reference = `GGW-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

    // Create the order (Pending until Paystack confirms).
    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert([{ user_id: userId, total, status: "Pending", payment_status: "Pending", paystack_reference: reference }])
      .select()
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: orderError?.message || "Could not create order" }, { status: 500 })
    }

    // Snapshot the ordered items.
    const orderItems = carts.map((item: any) => {
      const product = line(item)
      return { order_id: order.id, product_id: product.id, quantity: item.quantity, price: product.price }
    })
    const { error: itemError } = await admin.from("order_items").insert(orderItems)
    if (itemError) {
      return NextResponse.json({ error: itemError.message }, { status: 500 })
    }

    // Start Paystack (hosted checkout: card + mobile money).
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin
    const { authorization_url } = await initializeTransaction({
      email,
      amountGhs: total,
      reference,
      callbackUrl: `${siteUrl}/checkout/callback`,
      metadata: { order_id: order.id, user_id: userId },
    })

    return NextResponse.json({ success: true, orderId: order.id, reference, authorization_url })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Checkout failed" }, { status: 500 })
  }
}
