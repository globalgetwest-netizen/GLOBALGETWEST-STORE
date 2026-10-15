// app/orders/[id]/success/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseServerClient } from '@/lib/supabase/server';
import { formatUsd } from '@/lib/catalog';

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServerClient();

  const { data: order } = await supabase
    .from('orders')
    .select('order_number, status, total_usd_cents, currency, shipping_carrier, shipping_service')
    .eq('id', id)
    .single();

  if (!order) notFound();

  // Only these statuses mean money was actually received — 'cancelled' and
  // 'refunded' must not show a thank-you as if the order went through.
  const paid = ['paid', 'processing', 'fulfilled', 'shipped', 'delivered'].includes(order.status);
  const closed = order.status === 'cancelled' || order.status === 'refunded';

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="font-display text-3xl mb-3">
        {paid
          ? 'Thank you for your order!'
          : closed
            ? `This order was ${order.status}`
            : 'Order received — awaiting payment confirmation'}
      </h1>
      <p className="text-[var(--color-ink-soft)] mb-8">
        Order <strong>{order.order_number}</strong> — {formatUsd(order.total_usd_cents)}
        {order.shipping_carrier && (
          <> · shipping via {order.shipping_carrier} {order.shipping_service}</>
        )}
      </p>
      <p className="text-sm text-[var(--color-ink-soft)] mb-8">
        {paid
          ? "We'll email you tracking details once your order ships."
          : closed
            ? 'If you think this is a mistake, contact support with your order number.'
            : "If you completed payment and this doesn't update shortly, contact support with your order number."}
      </p>
      <Link href="/products" className="focus-ring text-[var(--color-forest)] font-medium hover:underline">
        Continue shopping →
      </Link>
    </div>
  );
}
