// app/orders/[id]/invoice/page.tsx
// Printable invoice for an order. One document, three states:
//   awaiting payment → "Pro-forma invoice" with how-to-pay instructions
//   paid             → "Receipt"
//   cancelled/refunded → "Invoice" marked accordingly
// Customers save it as a PDF with the browser's print dialog. RLS limits
// it to the customer who placed the order, plus staff and admins.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseServerClient } from '@/lib/supabase/server';
import { formatMoney, formatUsd } from '@/lib/format';
import { getOrderCharge, PAID_STATUSES } from '@/lib/orderCharge';
import { COUNTRIES } from '@/lib/countries';
import { SUPPORT_EMAIL, contactForCountry, westernUnionDesk } from '@/lib/contact';
import { PrintButton } from '@/components/PrintButton';
import { isManualMethod, METHOD_LABEL, methodNote, paymentSteps, type ManualMethod } from '@/lib/paymentMethods';

export const metadata: Metadata = {
  title: 'Invoice — GLOBALGETWEST',
  robots: { index: false, follow: false },
};

interface InvoiceItem {
  id: string;
  product_name_snapshot: string;
  variant_name_snapshot: string;
  unit_price_usd_cents: number;
  quantity: number;
  line_total_usd_cents: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
  if (!order) notFound();

  const [{ data: itemRows }, { data: address }, charge] = await Promise.all([
    supabase.from('order_items').select('*').eq('order_id', id),
    order.shipping_address_id
      ? supabase
        .from('addresses')
        .select('full_name, phone, line1, line2, city, region, postal_code, country_code')
        .eq('id', order.shipping_address_id)
        .maybeSingle()
      : Promise.resolve({ data: null }),
    getOrderCharge(supabase, order),
  ]);
  const items = (itemRows ?? []) as InvoiceItem[];

  // Guests' email is on the order; registered customers' is on their account.
  let email: string | null = order.contact_email ?? null;
  if (!email && user && user.id === order.customer_id) email = user.email ?? null;
  if (!email) {
    const { data: profile } = await supabase.from('profiles').select('email').eq('id', order.customer_id).maybeSingle();
    email = profile?.email ?? null;
  }

  const paid = PAID_STATUSES.includes(order.status);
  const closed = order.status === 'cancelled' || order.status === 'refunded';
  const pending = !paid && !closed;
  const title = paid ? 'Receipt' : pending ? 'Pro-forma invoice' : 'Invoice';
  const statusLabel = paid ? 'Paid' : pending ? 'Awaiting payment' : order.status === 'refunded' ? 'Refunded' : 'Cancelled';
  const statusClass = paid
    ? 'bg-[var(--color-forest)] text-white'
    : pending
      ? 'bg-[var(--color-ochre)]/15 text-[#7a5418] border border-[var(--color-ochre)]/40'
      : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/30';

  const totalLabel = formatMoney(charge.amountMinorUnits, charge.currency);
  const country = COUNTRIES.find((c) => c.code === address?.country_code)?.name ?? address?.country_code ?? '';
  // The invoice is the customer's own document, so it prints their
  // agent's number in full — including the Africa agent's.
  const contact = contactForCountry(order.shipping_country_code ?? address?.country_code ?? '');
  const method: ManualMethod = isManualMethod(order.payment_method) ? order.payment_method : 'bank_transfer';
  const wuDesk = method === 'western_union' ? westernUnionDesk(contact) : undefined;
  const stepContactName = wuDesk ? 'Our Western Union desk' : `Your ${contact.label} agent`;
  const invoiceContacts = wuDesk
    ? [{ name: 'Western Union desk', phone: wuDesk.display, how: 'call or WhatsApp' }]
    : [{ name: `${contact.label} agent`, phone: contact.display, how: 'WhatsApp' }];

  return (
    <div className="mx-auto max-w-[860px] px-4 py-10 print:p-0 print:max-w-none">
      {/* Toolbar — screen only */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <Link href={`/orders/${order.id}/success`} className="focus-ring text-sm text-[var(--color-forest)] font-medium hover:underline">
          ← Back to order
        </Link>
        <PrintButton label={`Download ${paid ? 'receipt' : 'invoice'} (PDF)`} />
      </div>

      <article className="bg-white border border-[var(--color-border)] rounded-lg px-8 py-10 sm:px-12 sm:py-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)] print:border-0 print:shadow-none print:rounded-none print:p-0 text-[13px] leading-relaxed text-[var(--color-ink)]">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-6 pb-8 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" width={44} height={44} className="rounded-full" />
            <div>
              <p className="font-display text-xl tracking-tight">GLOBALGETWEST</p>
              <p className="text-[11px] text-[var(--color-ink-soft)]">www.globalgetwest.com · {SUPPORT_EMAIL}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl leading-none mb-3">{title}</p>
            <span className={`inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${statusClass}`}>
              {statusLabel}
            </span>
          </div>
        </header>

        {/* Meta */}
        <section className="grid sm:grid-cols-3 gap-6 py-8 border-b border-[var(--color-border)]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)] mb-1.5">{paid ? 'Receipt for order' : 'Invoice number'}</p>
            <p className="font-semibold text-sm">{order.order_number}</p>
            <p className="text-[var(--color-ink-soft)] mt-2">Issued {formatDate(order.created_at)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)] mb-1.5">Billed to</p>
            <p className="font-medium">{address?.full_name ?? 'Customer'}</p>
            {email && <p className="text-[var(--color-ink-soft)] break-all">{email}</p>}
            {address?.phone && <p className="text-[var(--color-ink-soft)]">{address.phone}</p>}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)] mb-1.5">Deliver to</p>
            {address ? (
              <p className="text-[var(--color-ink-soft)]">
                {address.line1}{address.line2 && <>, {address.line2}</>}<br />
                {address.city}{address.region && `, ${address.region}`} {address.postal_code}<br />
                {country}
              </p>
            ) : <p className="text-[var(--color-ink-soft)]">—</p>}
          </div>
        </section>

        {/* Items */}
        <table className="w-full mt-8">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-muted)] text-left border-b border-[var(--color-border)]">
              <th className="font-medium pb-3">Item</th>
              <th className="font-medium pb-3 text-center w-14">Qty</th>
              <th className="font-medium pb-3 text-right w-28">Unit price</th>
              <th className="font-medium pb-3 text-right w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-[var(--color-border)] align-top">
                <td className="py-3.5 pr-4">
                  <p className="font-medium">{item.product_name_snapshot}</p>
                  <p className="text-[var(--color-ink-soft)] text-xs">{item.variant_name_snapshot}</p>
                </td>
                <td className="py-3.5 text-center tabular-nums">{item.quantity}</td>
                <td className="py-3.5 text-right tabular-nums">{formatUsd(item.unit_price_usd_cents)}</td>
                <td className="py-3.5 text-right tabular-nums">{formatUsd(item.line_total_usd_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mt-6">
          <dl className="w-full sm:w-80 space-y-2">
            <div className="flex justify-between">
              <dt className="text-[var(--color-ink-soft)]">Subtotal</dt>
              <dd className="tabular-nums">{formatUsd(order.subtotal_usd_cents)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-ink-soft)]">
                Delivery{order.shipping_service && <span className="text-[var(--color-ink-muted)]"> · {order.shipping_service}</span>}
              </dt>
              <dd className="tabular-nums">{order.shipping_usd_cents === 0 ? 'Free' : formatUsd(order.shipping_usd_cents)}</dd>
            </div>
            {order.tax_usd_cents > 0 && (
              <div className="flex justify-between">
                <dt className="text-[var(--color-ink-soft)]">Tax</dt>
                <dd className="tabular-nums">{formatUsd(order.tax_usd_cents)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-[var(--color-border)] pt-2">
              <dt className="font-medium">Total (USD)</dt>
              <dd className="font-medium tabular-nums">{formatUsd(order.total_usd_cents)}</dd>
            </div>
            <div className="flex justify-between items-baseline rounded-md bg-[var(--color-parchment-warm)] border border-[var(--color-border)] px-3 py-2.5 mt-3">
              <dt className="font-semibold">{paid ? 'Amount paid' : 'Amount due'}</dt>
              <dd className="font-display text-2xl tabular-nums">{totalLabel}</dd>
            </div>
            {charge.currency !== 'USD' && (
              <p className="text-right text-[11px] text-[var(--color-ink-muted)]">
                Converted at 1 USD = {charge.rate.toLocaleString('en-US', { maximumFractionDigits: 4 })} {charge.currency}
              </p>
            )}
          </dl>
        </div>

        {/* Payment instructions / confirmation */}
        {pending && (
          <section className="mt-10 rounded-lg border border-[var(--color-border)] p-6">
            <p className="font-display text-lg mb-3">How to pay</p>
            {charge.hasOnlinePayment ? (
              <p className="text-[var(--color-ink-soft)]">
                This order is being paid online. If your payment didn&apos;t complete, contact us at {SUPPORT_EMAIL} with
                your invoice number.
              </p>
            ) : (
              <>
                <div className="grid sm:grid-cols-3 gap-4 mb-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)] mb-1">Method</p>
                    <p className="font-medium">{METHOD_LABEL[method]}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)] mb-1">Amount due</p>
                    <p className="font-semibold tabular-nums">{totalLabel}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)] mb-1">
                      {method === 'western_union' ? 'Your reference' : 'Payment reference'}
                    </p>
                    <p className="font-semibold">{order.order_number}</p>
                  </div>
                </div>
                <ol className="space-y-3">
                  {paymentSteps(method, { amount: totalLabel, reference: order.order_number, contactName: stepContactName }).map((step, i) => (
                    <li key={step.title} className="flex gap-3">
                      <span className="w-5 h-5 shrink-0 rounded-full border border-[var(--color-ink)] text-[11px] font-semibold inline-flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-medium">{step.title}</p>
                        <p className="text-[var(--color-ink-soft)]">{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-5 pt-4 border-t border-[var(--color-border)]">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)] mb-2">Official contacts</p>
                  <ul className="space-y-1">
                    {invoiceContacts.map((c) => (
                      <li key={c.phone} className="flex flex-wrap justify-between gap-x-4">
                        <span className="text-[var(--color-ink-soft)]">{c.name}</span>
                        <span className="font-medium whitespace-nowrap">{c.phone} · {c.how}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[11px] text-[var(--color-ink-muted)]">{methodNote(method)}</p>
                </div>
              </>
            )}
          </section>
        )}
        {paid && (
          <p className="mt-10 text-center text-[var(--color-ink-soft)]">
            Thank you for your order. Payment received in full.
          </p>
        )}

        <footer className="mt-12 pt-6 border-t border-[var(--color-border)] text-center text-[11px] text-[var(--color-ink-muted)] space-y-1">
          <p>
            {pending
              ? 'This is a pro-forma invoice. Your receipt is issued once payment is confirmed.'
              : `Questions about this ${paid ? 'receipt' : 'invoice'}? Email ${SUPPORT_EMAIL} and quote ${order.order_number}.`}
          </p>
          <p>GLOBALGETWEST · www.globalgetwest.com</p>
        </footer>
      </article>
    </div>
  );
}
