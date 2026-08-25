import { NextResponse } from "next/server"
import { getPrisma } from "@/lib/prisma"
import { initializeTransaction } from "@/lib/paystack"
import { validateShippingAddress } from "@/lib/shipping"
import { currentUser } from "@clerk/nextjs/server"

// Creates a pending order from the user's cart, then starts a Paystack
// transaction and returns the hosted checkout URL. Stock is only reduced and
// the cart is only cleared AFTER payment is confirmed (see lib/orders.ts).
export async function POST(req: Request) {
  const prisma = getPrisma()

  try {
    const user = await currentUser()
    if (!user || !user.emailAddresses[0]?.emailAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const email = user.emailAddresses[0].emailAddress
    const { shippingAddress } = await req.json()

    // Validate shipping address snapshot
    const shippingError = validateShippingAddress(shippingAddress)
    if (shippingError) {
      return NextResponse.json({ error: shippingError }, { status: 400 })
    }

    // Find the customer in our Neon database by email
    const customer = await prisma.customer.findUnique({
      where: { email },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 400 })
    }

    // Get or create the cart for this customer
    let cart = await prisma.cart.findFirst({
      where: { customer_id: customer.id },
    })

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          customer_id: customer.id,
        },
      })
    }

    // Load the cart with product details.
    const cartItems = await prisma.cartItem.findMany({
      where: { cart_id: cart.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            base_price: true,
            currency: true,
            stock_quantity: true,
          },
        },
      },
    })

    if (cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
    }

    // Stock check.
    for (const item of cartItems) {
      const product = item.product
      if (!product) continue
      if (Number(product.stock_quantity) < Number(item.quantity)) {
        return NextResponse.json({ error: "Item is out of stock" }, { status: 400 })
      }
    }

    // Total (USD).
    const total = cartItems.reduce((sum: number, item: any) => {
      if (!item.product) return sum
      return sum + Number(item.product.base_price) * Number(item.quantity)
    }, 0)

    if (total <= 0) {
      return NextResponse.json({ error: "Order total must be greater than zero" }, { status: 400 })
    }

    const reference = `GGW-${Date.now()}`

    // Create the order (Pending until Paystack confirms) together with its
    // line items, payment record, and immutable shipping address snapshot.
    // All in one transaction.
    const order = await prisma.$transaction(async (tx: any) => {
      const created = await tx.order.create({
        data: {
          customer_id: customer.id,
          currency: "USD",
          grand_total: total,
          payment_status: "Pending",
          fulfillment_status: "Pending",
          // Keep this field for now for compat, but the snapshot is in
          // OrderShippingAddress
          shipping_address: shippingAddress as any,
        },
      })

      // Create immutable shipping address snapshot
      await tx.orderShippingAddress.create({
        data: {
          order_id: created.id,
          ...shippingAddress,
        },
      })

      await tx.orderItem.createMany({
        data: cartItems.map((item: any) => {
          const unitPrice = Number(item.product.base_price)
          const qty = Number(item.quantity)
          return {
            order_id: created.id,
            product_id: item.product.id,
            product_name: item.product.name,
            product_sku: null,
            variant_id: item.variant_id ?? null,
            variant_name: null,
            quantity: qty,
            unit_price: unitPrice,
            currency: item.product.currency || "USD",
            discount_amount: 0,
            tax_amount: 0,
            total_price: unitPrice * qty,
          }
        }),
      })

      await tx.payment.create({
        data: {
          order_id: created.id,
          provider: "paystack",
          provider_tx_id: reference,
          amount: total,
          currency: "USD",
          status: "Pending",
        },
      })

      return created
    })

    // Clear the cart items now that the order snapshot exists.
    await prisma.cartItem.deleteMany({
      where: { cart_id: cart.id },
    })

    // Start Paystack (hosted checkout: card + mobile money).
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin
    const { authorization_url } = await initializeTransaction({
      email,
      amountUsd: total,
      reference,
      callbackUrl: `${siteUrl}/checkout/callback`,
      metadata: { order_id: order.id, customer_id: customer.id },
    })

    return NextResponse.json({ success: true, orderId: order.id, reference, authorization_url })
  } catch (error: any) {
    console.error("Checkout error:", error)
    return NextResponse.json({ error: error.message || "Checkout failed" }, { status: 500 })
  }
}
