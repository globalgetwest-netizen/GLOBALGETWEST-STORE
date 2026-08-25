// app/admin/orders/page.tsx
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/guard';
import { formatUsd } from '@/lib/catalog';

const STATUS_STYLES: Record<string, string> = {
  pending_payment: 'bg-gray-200 text-gray-700',
  paid: 'bg-blue-100 text-blue-700',
  processing: 'bg-amber-100 text-amber-700',
  fulfilled: 'bg-teal-100 text-teal-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-red-100 text-red-700',
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const { supabase } = await requireAdmin();

  let query = supabase
    .from('orders')
    .select('id, order_number, status, total_usd_cents, currency, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (status) query = query.eq('status', status);

  const { data: orders } = await query;

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Orders</h1>

      <div className="flex gap-2 mb-6 text-sm flex-wrap">
        <FilterLink current={status} value={undefined} label="All" />
        {Object.keys(STATUS_STYLES).map((s) => (
          <FilterLink key={s} current={status} value={s} label={s.replace('_', ' ')} />
        ))}
      </div>

      <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-white/60">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-parchment-warm)] text-left">
            <tr>
              <th className="px-4 py-2.5 font-medium">Order</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Total</th>
              <th className="px-4 py-2.5 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-2.5">
                  <Link href={`/admin/orders/${o.id}`} className="focus-ring text-[var(--color-forest)] font-medium hover:underline">
                    {o.order_number}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[o.status] ?? ''}`}>
                    {o.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-2.5">{formatUsd(o.total_usd_cents)} <span className="text-[var(--color-ink-soft)]">{o.currency}</span></td>
                <td className="px-4 py-2.5 text-[var(--color-ink-soft)]">{new Date(o.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {(!orders || orders.length === 0) && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-ink-soft)]">No orders match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterLink({ current, value, label }: { current?: string; value?: string; label: string }) {
  const active = current === value;
  return (
    <Link
      href={value ? `/admin/orders?status=${value}` : '/admin/orders'}
      className={`focus-ring px-3 py-1 rounded-full capitalize ${active ? 'bg-[var(--color-forest)] text-[var(--color-parchment)]' : 'bg-white border border-[var(--color-border)]'}`}
    >
      {label}
    </Link>
  );
}
