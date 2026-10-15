// app/orders/[id]/success/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseServerClient } from '@/lib/supabase/server';
import { formatMoney, formatUsd } from '@/lib/format';
import { SaveGuestDetails } from '@/components/SaveGuestDetails';
import { RefreshWhilePending } from '@/components/RefreshWhilePending';

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: order } = await supabase
    .from('orders')
    // '*' rather than a column list so this page doesn't break if migration
    // 014 (contact_email) hasn't been run yet.
    .select('*')
    .eq('id', id)
    .single();

  if (!order) notFound();

  // Show what the customer was actually charged (e.g. GH₵ for Ghana), not
  // just the USD reference total.
  const { data: payment } = await supabase
    .from('payments')
    .select('currency, amount_minor_units')
    .eq('order_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const amountLabel = payment && payment.currency !== 'USD'
    ? formatMoney(Number(payment.amount_minor_units), payment.currency)
    : formatUsd(order.total_usd_cents);

  // Only these statuses mean money was actually received — 'cancelled' and
  // 'refunded' must not show a thank-you as if the order went through.
  const paid = ['paid', 'processing', 'fulfilled', 'shipped', 'delivered'].includes(order.status);
  const closed = order.status === 'cancelled' || order.status === 'refunded';

  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      {!paid && !closed && <RefreshWhilePending />}
      <div className="text-center">
        <div
          className={`mx-auto mb-6 w-14 h-14 rounded-full inline-flex items-center justify-center ${
            paid ? 'bg-[var(--color-forest)] text-white' : 'bg-[var(--color-parchment-warm)] border border-[var(--color-border)] text-[var(--color-ink-soft)]'
          }`}
          aria-hidden="true"
        >
          {paid ? (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          ) : closed ? (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin [animation-duration:2s]"><path d="M12 3a9 9 0 1 0 9 9" /></svg>
          )}
        </div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-ochre)] font-semibold mb-3">
          Order {order.order_number}
        </p>
        <h1 className="font-display text-4xl mb-3">
          {paid ? 'Thank you for your order' : closed ? `This order was ${order.status}` : 'Confirming your payment'}
        </h1>
        <p className="text-[var(--color-ink-soft)]">
          {paid
            ? "Your payment is confirmed. We'll email you tracking details as soon as your order ships."
            : closed
              ? 'If you think this is a mistake, contact support with your order number.'
              : "This usually takes a few seconds and the page will update by itself. If you paid and it doesn't change within a few minutes, contact support with your order number."}
        </p>
      </div>

      <div className="mt-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-parchment-warm)] p-6 text-sm space-y-2.5">
        <div className="flex justify-between">
          <span className="text-[var(--color-ink-soft)]">Order number</span>
          <span className="font-medium">{order.order_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-ink-soft)]">Total</span>
          <span className="font-medium">{amountLabel}</span>
        </div>
        {order.shipping_carrier && (
          <div className="flex justify-between gap-4">
            <span className="text-[var(--color-ink-soft)]">Delivery</span>
            <span className="text-right">{order.shipping_carrier} · {order.shipping_service}</span>
          </div>
        )}
        {order.contact_email && (
          <div className="flex justify-between gap-4">
            <span className="text-[var(--color-ink-soft)]">Receipt sent to</span>
            <span className="text-right truncate">{order.contact_email}</span>
          </div>
        )}
      </div>

      {user?.is_anonymous && order.contact_email && paid && (
        <div className="mt-6">
          <SaveGuestDetails email={order.contact_email} />
        </div>
      )}

      <div className="mt-10 text-center">
        <Link
          href="/products"
          className="focus-ring inline-block bg-[var(--color-charcoal)] text-white font-semibold px-7 py-3 rounded hover:bg-black transition-colors"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
