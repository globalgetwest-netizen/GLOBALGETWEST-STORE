// app/account/orders/page.tsx
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseServerClient } from '@/lib/supabase/server';
import { formatUsd } from '@/lib/catalog';

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  paid: 'Paid',
  processing: 'Processing',
  fulfilled: 'Fulfilled',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export default async function OrderHistoryPage() {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect('/account/sign-in?next=/account/orders');

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, status, total_usd_cents, currency, created_at')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-3xl mb-8">Order History</h1>

      {!orders || orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[var(--color-ink-soft)] mb-4">No orders yet.</p>
          <Link href="/products" className="focus-ring text-[var(--color-forest)] font-medium hover:underline">
            Start shopping →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between gap-4 border border-[var(--color-border)] rounded-lg p-4 bg-white/60"
            >
              <Link href={`/orders/${o.id}/success`} className="focus-ring flex-1 min-w-0 hover:text-[var(--color-forest)]">
                <p className="font-medium text-sm">{o.order_number}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  {new Date(o.created_at).toLocaleDateString()} · {STATUS_LABELS[o.status] ?? o.status}
                </p>
              </Link>
              <p className="font-semibold">{formatUsd(o.total_usd_cents)}</p>
              <Link
                href={`/orders/${o.id}/invoice`}
                className="focus-ring text-xs font-medium text-[var(--color-forest)] border border-[var(--color-border)] rounded px-2.5 py-1.5 hover:bg-[var(--color-parchment-warm)]"
              >
                {['paid', 'processing', 'fulfilled', 'shipped', 'delivered'].includes(o.status) ? 'Receipt' : 'Invoice'}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
