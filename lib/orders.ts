import { getSupabaseAdmin } from "@/lib/supabaseAdmin"

// Mark an order paid exactly once: flip status, reduce stock, clear the buyer's
// cart. Idempotent — safe to call from both the webhook and the callback, and
// safe to call twice (it no-ops if the order is already Paid).
export async function confirmOrderPaid(reference: string): Promise<{
  ok: boolean
  already?: boolean
  orderId?: string
  reason?: string
}> {
  const admin = getSupabaseAdmin()

  const { data: order, error } = await admin
    .from("orders")
    .select("id, user_id, payment_status")
    .eq("paystack_reference", reference)
    .single()

  if (error || !order) return { ok: false, reason: "order not found" }
  if (order.payment_status === "Paid") {
    return { ok: true, already: true, orderId: order.id }
  }

  // Mark paid + move into fulfilment.
  await admin
    .from("orders")
    .update({ payment_status: "Paid", status: "Processing" })
    .eq("id", order.id)

  // Reduce stock for each line item.
  const { data: items } = await admin
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", order.id)

  for (const item of items ?? []) {
    if (!item.product_id) continue
    const { data: product } = await admin
      .from("products")
      .select("stock_quantity")
      .eq("id", item.product_id)
      .single()

    if (product) {
      const next = Math.max(0, Number(product.stock_quantity) - Number(item.quantity))
      await admin.from("products").update({ stock_quantity: next }).eq("id", item.product_id)
    }
  }

  // Empty the buyer's cart now that the order is paid.
  if (order.user_id) {
    await admin.from("carts").delete().eq("user_id", order.user_id)
  }

  return { ok: true, orderId: order.id }
}
