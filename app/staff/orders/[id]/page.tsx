// app/staff/orders/[id]/page.tsx
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/staff/guard';
import { formatUsd } from '@/lib/catalog';
import { StaffOrderPanel } from '@/components/staff/StaffOrderPanel';

export default async function StaffOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireStaff();

  const [{ data: order }, { data: items }, { data: events }] = await Promise.all([
    supabase
      .from('orders')
      .select(`
        id, order_number, status, subtotal_usd_cents, shipping_usd_cents, total_usd_cents,
        shipping_carrier, shipping_service, assigned_staff_id, created_at,
        shipping_address:addresses!orders_shipping_address_id_fkey ( full_name, phone, line1, line2, city, region, postal_code, country_code )
      `)
      .eq('id', id)
      .single(),
    supabase.from('order_items').select('*').eq('order_id', id),
    supabase.from('order_events').select('*').eq('order_id', id).order('created_at', { ascending: false }),
  ]);

  if (!order) notFound();

  // Note: payments table intentionally not queried here — staff don't need
  // gateway/transaction details to fulfil an order, and RLS still permits it
  // (is_staff_or_admin() covers payments read), but this view stays scoped
  // to what fulfilment actually needs.

  // Supabase types a nested foreign-table select as an array by default
  // (one-to-many shape) even though shipping_address_id is a one-to-one FK,
  // because we're not using generated Database types. Normalize here rather
  // than assume the shape at every usage site below.
  const shippingAddress = Array.isArray(order.shipping_address)
    ? order.shipping_address[0]
    : order.shipping_address;

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">{order.order_number}</h1>
      <p className="text-[var(--color-ink-soft)] text-sm mb-8">
        Placed {new Date(order.created_at).toLocaleString()}
      </p>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <section className="border border-[var(--color-border)] rounded-lg p-5 bg-white/60">
            <h2 className="font-display text-lg mb-3">Items to Pack</h2>
            <table className="w-full text-sm">
              <tbody>
                {(items ?? []).map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0 border-[var(--color-border)]">
                    <td className="py-2">
                      <p className="font-medium">{item.product_name_snapshot}</p>
                      <p className="text-xs text-[var(--color-ink-soft)]">{item.variant_name_snapshot}</p>
                    </td>
                    <td className="py-2 text-right font-semibold">× {item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="border border-[var(--color-border)] rounded-lg p-5 bg-white/60">
            <h2 className="font-display text-lg mb-3">Ship To</h2>
            {shippingAddress ? (
              <p className="text-sm leading-relaxed">
                <strong>{shippingAddress.full_name}</strong><br />
                {shippingAddress.phone}<br />
                {shippingAddress.line1}{shippingAddress.line2 && <>, {shippingAddress.line2}</>}<br />
                {shippingAddress.city}{shippingAddress.region && `, ${shippingAddress.region}`} {shippingAddress.postal_code}<br />
                {shippingAddress.country_code}
              </p>
            ) : <p className="text-sm text-[var(--color-ink-soft)]">No address on file.</p>}
            <p className="text-sm mt-3 pt-3 border-t border-[var(--color-border)]">
              <strong>Carrier:</strong> {order.shipping_carrier ?? '—'} {order.shipping_service ?? ''}
            </p>
          </section>

          <section className="border border-[var(--color-border)] rounded-lg p-5 bg-white/60">
            <h2 className="font-display text-lg mb-3">Activity Log</h2>
            <div className="space-y-2 text-sm">
              {(events ?? []).map((e) => (
                <div key={e.id} className="flex justify-between text-[var(--color-ink-soft)]">
                  <span><strong className="text-[var(--color-ink)] capitalize">{e.event_type.replace('_', ' ')}</strong>{e.detail && ` — ${e.detail}`}</span>
                  <span>{new Date(e.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="border border-[var(--color-border)] rounded-lg p-5 bg-white/60 h-fit">
          <h2 className="font-display text-lg mb-4">Fulfilment</h2>
          <StaffOrderPanel
            orderId={order.id}
            currentStatus={order.status}
            isAssignedToMe={order.assigned_staff_id === user.id}
            staffId={user.id}
          />
        </aside>
      </div>
    </div>
  );
}
