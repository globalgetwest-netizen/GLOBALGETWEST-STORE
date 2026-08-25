// app/admin/page.tsx
import { requireAdmin } from '@/lib/admin/guard';
import { formatUsd } from '@/lib/catalog';

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin();

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalOrders },
    { count: pendingOrders },
    { data: recentPaidOrders },
    { count: totalProducts },
    { count: lowStockCount },
  ] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['paid', 'processing']),
    supabase.from('orders').select('total_usd_cents, created_at').gte('created_at', since30d).neq('status', 'pending_payment'),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('variant_stock').select('variant_id', { count: 'exact', head: true }).lt('stock_on_hand', 10),
  ]);

  const revenue30d = (recentPaidOrders ?? []).reduce((sum, o) => sum + o.total_usd_cents, 0);

  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, order_number, status, total_usd_cents, created_at')
    .order('created_at', { ascending: false })
    .limit(8);

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Revenue (30d)" value={formatUsd(revenue30d)} />
        <StatCard label="Orders needing action" value={String(pendingOrders ?? 0)} accent />
        <StatCard label="Total orders" value={String(totalOrders ?? 0)} />
        <StatCard label="Active products" value={String(totalProducts ?? 0)} />
      </div>

      {(lowStockCount ?? 0) > 0 && (
        <div className="mb-8 rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-4 text-sm">
          <strong className="text-[var(--color-danger)]">{lowStockCount} variant{lowStockCount === 1 ? '' : 's'}</strong>{' '}
          {lowStockCount === 1 ? 'is' : 'are'} below 10 units in stock.
        </div>
      )}

      <h2 className="font-display text-xl mb-4">Recent Orders</h2>
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
            {(recentOrders ?? []).map((o) => (
              <tr key={o.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-2.5">
                  <a href={`/admin/orders/${o.id}`} className="focus-ring text-[var(--color-forest)] font-medium hover:underline">
                    {o.order_number}
                  </a>
                </td>
                <td className="px-4 py-2.5">{o.status}</td>
                <td className="px-4 py-2.5">{formatUsd(o.total_usd_cents)}</td>
                <td className="px-4 py-2.5 text-[var(--color-ink-soft)]">{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? 'border-[var(--color-ochre)] bg-[var(--color-ochre)]/10' : 'border-[var(--color-border)] bg-white/60'}`}>
      <p className="text-xs text-[var(--color-ink-soft)] mb-1">{label}</p>
      <p className="font-display text-2xl">{value}</p>
    </div>
  );
}
