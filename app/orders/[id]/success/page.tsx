// app/orders/[id]/success/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseServerClient } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/format';
import { getOrderCharge, PAID_STATUSES } from '@/lib/orderCharge';
import { SaveGuestDetails } from '@/components/SaveGuestDetails';
import { RefreshWhilePending } from '@/components/RefreshWhilePending';
import { PaymentDetailsCard } from '@/components/PaymentDetailsCard';
import { isManualMethod } from '@/lib/paymentMethods';
import { contactForCountry } from '@/lib/contact';

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

  // What the customer was actually charged (e.g. GH₵ for Ghana) — the same
  // figure the invoice shows.
  const charge = await getOrderCharge(supabase, order);
  const amountLabel = formatMoney(charge.amountMinorUnits, charge.currency);
  // No online payment attempt on a pending order = the customer chose bank
  // transfer / Western Union, arranged by their regional agent on WhatsApp.
  const isAgentOrder = !charge.hasOnlinePayment && order.status === 'pending_payment';
  const contact = contactForCountry(order.shipping_country_code ?? '');

  // Only these statuses mean money was actually received — 'cancelled' and
  // 'refunded' must not show a thank-you as if the order went through.
  const paid = PAID_STATUSES.includes(order.status);
  const closed = order.status === 'cancelled' || order.status === 'refunded';

  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      {!paid && !closed && !isAgentOrder && <RefreshWhilePending />}
      <div className="text-center">
        <div
          className={`mx-auto mb-6 w-14 h-14 rounded-full inline-flex items-center justify-center ${
            paid || isAgentOrder ? 'bg-[var(--color-forest)] text-white' : 'bg-[var(--color-parchment-warm)] border border-[var(--color-border)] text-[var(--color-ink-soft)]'
          }`}
          aria-hidden="true"
        >
          {paid || isAgentOrder ? (
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
          {paid
            ? 'Thank you for your order'
            : isAgentOrder
              ? 'Your order is reserved'
              : closed ? `This order was ${order.status}` : 'Confirming your payment'}
        </h1>
        <p className="text-[var(--color-ink-soft)]">
          {paid
            ? "Your payment is confirmed. We'll email you tracking details as soon as your order ships."
            : isAgentOrder
              ? `Complete your ${isManualMethod(order.payment_method) && order.payment_method === 'western_union' ? 'Western Union' : 'bank transfer'} payment using the details below. Your items are held for you.`
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
          <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-4">
            <span className="text-[var(--color-ink-soft)] whitespace-nowrap">Receipt sent to</span>
            <span className="sm:text-right [overflow-wrap:anywhere]">{order.contact_email}</span>
          </div>
        )}
      </div>

      {isAgentOrder && (
        <PaymentDetailsCard
          method={isManualMethod(order.payment_method) ? order.payment_method : 'bank_transfer'}
          amountLabel={amountLabel}
          reference={order.order_number}
          contact={contact}
        />
      )}

      <div className="mt-6 text-center">
        <Link
          href={`/orders/${order.id}/invoice`}
          className="focus-ring inline-flex items-center gap-2 text-sm font-medium text-[var(--color-forest)] hover:underline"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" />
          </svg>
          {paid ? 'View and download receipt' : 'View and download invoice'}
        </Link>
      </div>

      {user?.is_anonymous && order.contact_email && paid && (
        <div className="mt-6">
          <SaveGuestDetails email={order.contact_email} />
        </div>
      )}

      <div className="mt-10 text-center">
        <Link
          href="/products"
          className="btn btn-primary"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
