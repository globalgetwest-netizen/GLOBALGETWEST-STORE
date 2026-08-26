// app/staff/page.tsx
import Link from 'next/link';
import { requireStaff } from '@/lib/staff/guard';
import { formatUsd } from '@/lib/format';

export default async function StaffQueuePage() {
  const { supabase, user, profile } = await requireStaff();

  // A staff member with a country assigned only sees that country's orders
  // in their queue; null country_code means unscoped (sees everything) —
  // used for admin/ceo browsing this portal, or a staff member who
  // genuinely covers multiple countries.
  const countryFilter = profile.country_code;

  let myOrdersQuery = supabase
    .from('orders')
    .select('id, order_number, status, total_usd_cents, shipping_country_code, created_at')
    .eq('assigned_staff_id', user.id)
    .in('status', ['paid', 'processing'])
    .order('created_at', { ascending: true });
  if (countryFilter) myOrdersQuery = myOrdersQuery.eq('shipping_country_code', countryFilter);
  const { data: myOrders } = await myOrdersQuery;

  let unassignedQuery = supabase
    .from('orders')
    .select('id, order_number, status, total_usd_cents, shipping_country_code, created_at')
    .is('assigned_staff_id', null)
    .in('status', ['paid', 'processing'])
    .order('created_at', { ascending: true })
    .limit(20);
  if (countryFilter) unassignedQuery = unassignedQuery.eq('shipping_country_code', countryFilter);
  const { data: unassigned } = await unassignedQuery;

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">My Queue</h1>
      {countryFilter && (
        <p className="text-[var(--color-ink-soft)] text-sm mb-7">
          Showing orders shipping to <strong>{countryFilter}</strong> only, based on your assigned country.
        </p>
      )}
      {!countryFilter && (
        <p className="text-[var(--color-ink-soft)] text-sm mb-7">
          No country restriction on your account — showing orders from all countries.
        </p>
      )}

      <section className="mb-10">
        <h2 className="font-display text-lg mb-3">Assigned to me ({myOrders?.length ?? 0})</h2>
        <OrderTable orders={myOrders ?? []} emptyLabel="Nothing assigned to you right now." />
      </section>

      <section>
        <h2 className="font-display text-lg mb-3">Unassigned — needs fulfilment ({unassigned?.length ?? 0})</h2>
        <OrderTable orders={unassigned ?? []} emptyLabel="No unassigned orders." />
      </section>
    </div>
  );
}

function OrderTable({ orders, emptyLabel }: { orders: any[]; emptyLabel: string }) {
  return (
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
          {orders.map((o) => (
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
          {orders.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-6 text-center text-[var(--color-ink-soft)]">{emptyLabel}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
