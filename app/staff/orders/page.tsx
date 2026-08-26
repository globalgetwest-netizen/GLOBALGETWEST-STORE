// app/staff/orders/page.tsx
import Link from 'next/link';
import { requireStaff } from '@/lib/staff/guard';
import { formatUsd } from '@/lib/format';

export default async function StaffOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const { supabase, profile } = await requireStaff();

  let query = supabase
    .from('orders')
    .select('id, order_number, status, total_usd_cents, shipping_country_code, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (status) query = query.eq('status', status);
  if (profile.country_code) query = query.eq('shipping_country_code', profile.country_code);

  const { data: orders } = await query;
  const statuses = ['paid', 'processing', 'fulfilled', 'shipped', 'delivered', 'cancelled'];

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">All Orders</h1>
      {profile.country_code && (
        <p className="text-[var(--color-ink-soft)] text-sm mb-6">
          Filtered to <strong>{profile.country_code}</strong>, your assigned country.
        </p>
      )}
      {!profile.country_code && (
        <p className="text-[var(--color-ink-soft)] text-sm mb-6">No country restriction — showing all countries.</p>
      )}

      <div className="flex gap-2 mb-6 text-sm flex-wrap">
        <Link href="/staff/orders" className={`focus-ring px-3 py-1 rounded-full ${!status ? 'bg-[var(--color-forest)] text-[var(--color-parchment)]' : 'bg-white border border-[var(--color-border)]'}`}>
          All
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/staff/orders?status=${s}`}
            className={`focus-ring px-3 py-1 rounded-full capitalize ${status === s ? 'bg-[var(--color-forest)] text-[var(--color-parchment)]' : 'bg-white border border-[var(--color-border)]'}`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-white/60">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-parchment-warm)] text-left">
            <tr>
              <th className="px-4 py-2.5 font-medium">Order</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Total</th>
              <th className="px-4 py-2.5 font-medium">Placed</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-2.5">
                  <Link href={`/staff/orders/${o.id}`} className="focus-ring text-[var(--color-forest)] font-medium hover:underline">
                    {o.order_number}
                  </Link>
                </td>
                <td className="px-4 py-2.5 capitalize">{o.status}</td>
                <td className="px-4 py-2.5">{formatUsd(o.total_usd_cents)}</td>
                <td className="px-4 py-2.5 text-[var(--color-ink-soft)]">{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {(!orders || orders.length === 0) && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-ink-soft)]">No orders match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
