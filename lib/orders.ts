import { getPrisma } from "@/lib/prisma"

// Mark an order paid exactly once: flip status, reduce stock, clear the buyer's
// cart. Idempotent â€” safe to call from both the webhook and the callback, and
// safe to call twice (it no-ops if the order is already Paid).
export async function confirmOrderPaid(reference: string): Promise<{
  ok: boolean
  already?: boolean
  orderId?: string
  reason?: string
}> {
  const prisma = getPrisma()

  // Find the order by Paystack reference (stored on the order/payment).
  const order = await prisma.order.findFirst({
    where: { payments: { some: { provider_tx_id: reference } } },
  })

  if (!order) {
    // Fall back to a direct reference column if one is added later.
    const byRef = await prisma.order.findFirst({
      where: { order_number: reference },
    })
    if (!byRef) return { ok: false, reason: "order not found" }
    return finalizeOrder(prisma, byRef)
  }

  return finalizeOrder(prisma, order)
}

async function finalizeOrder(
  prisma: ReturnType<typeof getPrisma>,
  order: { id: string; payment_status: string; customer_id: string | null }
): Promise<{ ok: boolean; already?: boolean; orderId?: string }> {
  if (order.payment_status === "Paid") {
    return { ok: true, already: true, orderId: order.id }
  }

  // Mark paid + move into fulfilment (wrapped so stock + cart stay consistent).
  await prisma.$transaction(async (tx: any) => {
    await tx.order.update({
      where: { id: order.id },
      data: { payment_status: "Paid", fulfillment_status: "Processing" },
    })

    // Reduce stock for each line item.
    const orderItems = await tx.orderItem.findMany({
      where: { order_id: order.id },
      select: {
        product_id: true,
        quantity: true,
        product: { select: { stock_quantity: true } },
      },
    })

    for (const item of orderItems) {
      if (!item.product_id) continue
      if (!item.product) continue
      const nextStock = Math.max(
        0,
        Number(item.product.stock_quantity) - Number(item.quantity)
      )
      await tx.product.update({
        where: { id: item.product_id },
        data: { stock_quantity: nextStock },
      })
    }

    // Empty the buyer's cart now that the order is paid.
    if (order.customer_id) {
      await tx.cart.deleteMany({ where: { customer_id: order.customer_id } })
    }
  })

  return { ok: true, orderId: order.id }
}
