// app/admin/orders/[id]/page.tsx
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/guard';
import { formatUsd } from '@/lib/catalog';
import { OrderDetailPanel } from '@/components/admin/OrderDetailPanel';

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const [{ data: order }, { data: items }, { data: events }, { data: payments }, { data: staff }] = await Promise.all([
    supabase
      .from('orders')
      .select(`
        *,
        shipping_address:addresses!orders_shipping_address_id_fkey ( full_name, phone, line1, line2, city, region, postal_code, country_code ),
        customer:profiles!orders_customer_id_fkey ( full_name )
      `)
      .eq('id', id)
      .single(),
    supabase.from('order_items').select('*').eq('order_id', id),
    supabase.from('order_events').select('*').eq('order_id', id).order('created_at', { ascending: false }),
    supabase.from('payments').select('*').eq('order_id', id),
    supabase.from('profiles').select('id, full_name').in('role', ['staff', 'admin']).eq('is_active', true),
  ]);

  if (!order) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">{order.order_number}</h1>
      <p className="text-[var(--color-ink-soft)] text-sm mb-8">
        Placed {new Date(order.created_at).toLocaleString()} by {order.customer?.full_name ?? 'customer'}
      </p>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <section className="border border-[var(--color-border)] rounded-lg p-5 bg-white/60">
            <h2 className="font-display text-lg mb-3">Items</h2>
            <table className="w-full text-sm">
              <tbody>
                {(items ?? []).map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0 border-[var(--color-border)]">
                    <td className="py-2">
                      <p className="font-medium">{item.product_name_snapshot}</p>
                      <p className="text-xs text-[var(--color-ink-soft)]">{item.variant_name_snapshot} × {item.quantity}</p>
                    </td>
                    <td className="py-2 text-right">{formatUsd(item.line_total_usd_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-[var(--color-border)] mt-3 pt-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-[var(--color-ink-soft)]">Subtotal</span><span>{formatUsd(order.subtotal_usd_cents)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--color-ink-soft)]">Shipping ({order.shipping_carrier ?? '—'} {order.shipping_service ?? ''})</span><span>{formatUsd(order.shipping_usd_cents)}</span></div>
              <div className="flex justify-between font-semibold"><span>Total</span><span>{formatUsd(order.total_usd_cents)}</span></div>
            </div>
          </section>

          <section className="border border-[var(--color-border)] rounded-lg p-5 bg-white/60">
            <h2 className="font-display text-lg mb-3">Shipping Address</h2>
            {order.shipping_address ? (
              <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
                {order.shipping_address.full_name}<br />
                {order.shipping_address.phone}<br />
                {order.shipping_address.line1}{order.shipping_address.line2 && <>, {order.shipping_address.line2}</>}<br />
                {order.shipping_address.city}{order.shipping_address.region && `, ${order.shipping_address.region}`} {order.shipping_address.postal_code}<br />
                {order.shipping_address.country_code}
              </p>
            ) : <p className="text-sm text-[var(--color-ink-soft)]">No address on file.</p>}
          </section>

          <section className="border border-[var(--color-border)] rounded-lg p-5 bg-white/60">
            <h2 className="font-display text-lg mb-3">Payments</h2>
            {(payments ?? []).map((p) => (
              <div key={p.id} className="text-sm flex justify-between border-b last:border-b-0 border-[var(--color-border)] py-2">
                <span className="capitalize">{p.gateway} — {p.status}</span>
                <span>{formatUsd(p.amount_usd_cents)}</span>
              </div>
            ))}
            {(!payments || payments.length === 0) && <p className="text-sm text-[var(--color-ink-soft)]">No payment attempts recorded.</p>}
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
          <h2 className="font-display text-lg mb-4">Manage Order</h2>
          <OrderDetailPanel
            orderId={order.id}
            currentStatus={order.status}
            currentAssigned={order.assigned_staff_id}
            staffOptions={staff ?? []}
          />
        </aside>
      </div>
    </div>
  );
}
