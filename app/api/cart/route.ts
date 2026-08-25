import { NextResponse } from "next/server"
import { getPrisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import { getR2ObjectUrl } from "@/lib/media"

// GET /api/cart - Get the current user's cart with products
export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const prisma = getPrisma()

  try {
    // Find the customer by email
    const customer = await prisma.customer.findUnique({
      where: { email: user.email },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Find the cart for this customer
    const cart = await prisma.cart.findFirst({
      where: { customer_id: customer.id },
    })

    if (!cart) {
      // Return empty cart if no cart exists
      return NextResponse.json({ items: [] })
    }

    // Get cart items with product details
    const cartItems = await prisma.cartItem.findMany({
      where: { cart_id: cart.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            base_price: true,
            currency: true,
            images: {
              select: {
                image_key: true,
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        created_at: "asc",
      },
    })

    // Format the response to match the previous structure (for now)
    const items = cartItems.map((item: any) => ({
      id: item.id,
      quantity: item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        price: item.product.base_price,
        image: item.product.images?.[0]?.image_key ? getR2ObjectUrl(item.product.images[0].image_key) : "/placeholder.png",
      },
    }))

    return NextResponse.json({ items })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch cart" }, { status: 500 })
  }
}

// POST /api/cart - Add a product to the cart (or increment if exists)
export async function POST(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const prisma = getPrisma()

  try {
    const { productId } = await req.json()
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    // Find the product to verify it exists and get price
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        base_price: true,
        currency: true,
        stock_quantity: true,
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Check stock
    if (product.stock_quantity <= 0) {
      return NextResponse.json({ error: "Product is out of stock" }, { status: 400 })
    }

    // Find or create the cart for this customer
    const customer = await prisma.customer.findUnique({
      where: { email: user.email },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    let cart = await prisma.cart.findFirst({
      where: { customer_id: customer.id },
    })

    if (!cart) {
      cart = await prisma.cart.create({
        data: { customer_id: customer.id },
      })
    }

    // Check if the item is already in the cart
    const existing = await prisma.cartItem.findFirst({
      where: {
        cart_id: cart.id,
        product_id: productId,
      },
    })

    if (existing) {
      // Check if we have enough stock for increment
      if (product.stock_quantity < existing.quantity + 1) {
        return NextResponse.json({ error: "Not enough stock available" }, { status: 400 })
      }
      // Increment quantity
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + 1 },
      })
    } else {
      // Add new item with quantity 1
      await prisma.cartItem.create({
        data: {
          cart_id: cart.id,
          product_id: productId,
          quantity: 1,
          unit_price: product.base_price,
          currency: product.currency,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to add to cart" }, { status: 500 })
  }
}

// PATCH /api/cart - Update cart item quantity
export async function PATCH(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const prisma = getPrisma()

  try {
    const { cartItemId, quantity } = await req.json()
    if (!cartItemId || quantity === undefined) {
      return NextResponse.json({ error: "Cart item ID and quantity are required" }, { status: 400 })
    }

    if (quantity < 1) {
      // If quantity is less than 1, remove the item (handled by DELETE)
      return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 })
    }

    // Find the cart item and verify it belongs to the current user
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: {
          include: {
            customer: {
              select: {
                email: true,
              },
            },
          },
        },
        product: {
          select: {
            stock_quantity: true,
          },
        },
      },
    })

    if (!cartItem) {
      return NextResponse.json({ error: "Cart item not found" }, { status: 404 })
    }

    // Verify the cart item belongs to the current user
    const customer = await prisma.customer.findUnique({
      where: { email: user.email },
    })

    if (!customer || cartItem.cart.customer_id !== customer.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Check stock
    if (cartItem.product.stock_quantity < quantity) {
      return NextResponse.json({ error: "Not enough stock available" }, { status: 400 })
    }

    // Update quantity
    await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update cart" }, { status: 500 })
  }
}

// DELETE /api/cart - Remove a cart item
export async function DELETE(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const prisma = getPrisma()

  try {
    const { cartItemId } = await req.json()
    if (!cartItemId) {
      return NextResponse.json({ error: "Cart item ID is required" }, { status: 400 })
    }

    // Find the cart item and verify it belongs to the current user
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: {
          include: {
            customer: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    })

    if (!cartItem) {
      return NextResponse.json({ error: "Cart item not found" }, { status: 404 })
    }

    // Verify the cart item belongs to the current user
    const customer = await prisma.customer.findUnique({
      where: { email: user.email },
    })

    if (!customer || cartItem.cart.customer_id !== customer.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Delete the cart item
    await prisma.cartItem.delete({
      where: { id: cartItemId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to remove cart item" }, { status: 500 })
  }
}