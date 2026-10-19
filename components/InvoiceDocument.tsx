// components/InvoiceDocument.tsx
// The printable invoice / receipt. Pure presentation — the page at
// app/orders/[id]/invoice gathers the data. One document, three states:
//   awaiting payment   → "Pro-forma invoice" with how-to-pay instructions
//   paid               → "Receipt" with payment details and a PAID seal
//   cancelled/refunded → "Invoice" marked accordingly
// Every copy carries a QR code that opens /verify/<order id>, where anyone
// can confirm the document is genuine (no personal details shown there).
import { formatMoney, formatUsd } from '@/lib/format';
import { SUPPORT_EMAIL } from '@/lib/contact';
import { METHOD_LABEL, methodNote, paymentSteps, type ManualMethod } from '@/lib/paymentMethods';
import type { OrderCharge } from '@/lib/orderCharge';
import type { ReceiptPayment } from '@/lib/receipt';

export interface InvoiceItem {
  id: string;
  product_name_snapshot: string;
  variant_name_snapshot: string;
  unit_price_usd_cents: number;
  quantity: number;
  line_total_usd_cents: number;
}

export interface InvoiceData {
  orderNumber: string;
  createdAt: string;
  state: 'paid' | 'pending' | 'cancelled' | 'refunded';
  subtotalUsdCents: number;
  shippingUsdCents: number;
  taxUsdCents: number;
  totalUsdCents: number;
  shippingService: string | null;
  items: InvoiceItem[];
  customer: { name: string; email: string | null; phone: string | null };
  deliverTo: string[];
  charge: OrderCharge;
  payment: ReceiptPayment;
  method: ManualMethod;
  stepContactName: string;
  contacts: { name: string; phone: string; how: string }[];
  qrSvg: string;
  verifyHref: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

const LABEL = 'text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)] mb-1.5';

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const paid = data.state === 'paid';
  const pending = data.state === 'pending';
  const title = paid ? 'Receipt' : pending ? 'Pro-forma invoice' : 'Invoice';
  const statusLabel = paid ? 'Paid' : pending ? 'Awaiting payment' : data.state === 'refunded' ? 'Refunded' : 'Cancelled';
  const statusClass = paid
    ? 'bg-[var(--color-forest)] text-white'
    : pending
      ? 'bg-[var(--color-ochre)]/15 text-[#7a5418] border border-[var(--color-ochre)]/40'
      : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/30';
  const totalLabel = formatMoney(data.charge.amountMinorUnits, data.charge.currency);
  const itemCount = data.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <article className="bg-white border border-[var(--color-border)] border-t-[3px] [border-top-color:var(--color-ochre)] rounded-xl px-7 py-9 sm:px-12 sm:py-11 shadow-[0_1px_2px_rgba(17,17,17,0.04),0_16px_40px_-24px_rgba(15,42,69,0.25)] print:border-x-0 print:border-b-0 print:shadow-none print:rounded-none print:px-0 print:py-6 text-[13px] leading-relaxed text-[var(--color-ink)]">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-6 pb-8 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={48} height={48} className="rounded-full" />
          <div>
            <p className="font-display text-[22px] leading-none tracking-tight text-[var(--color-forest)]">GLOBALGETWEST</p>
            <p className="mt-1.5 text-[11px] text-[var(--color-ink-soft)]">Natural therapeutic plant extracts · Shipped worldwide</p>
            <p className="text-[11px] text-[var(--color-ink-soft)]">www.globalgetwest.com · {SUPPORT_EMAIL}</p>
          </div>
        </div>
        <div className="w-full sm:w-auto text-left sm:text-right">
          <p className="font-display text-[32px] leading-none mb-2.5">{title}</p>
          <p className="text-[11px] text-[var(--color-ink-soft)] mb-2.5 tabular-nums">No. {data.orderNumber}</p>
          <span className={`inline-block rounded-full px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
      </header>

      {/* Parties and dates */}
      <section className="grid grid-cols-2 sm:grid-cols-[0.8fr_0.8fr_1.3fr_1.3fr] gap-x-6 gap-y-6 py-8 border-b border-[var(--color-border)]">
        <div>
          <p className={LABEL}>Issue date</p>
          <p className="font-medium">{formatDate(data.createdAt)}</p>
        </div>
        <div>
          <p className={LABEL}>{paid ? 'Paid on' : 'Status'}</p>
          <p className="font-medium">{paid && data.payment.paidAt ? formatDate(data.payment.paidAt) : statusLabel}</p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className={LABEL}>Billed to</p>
          <p className="font-medium">{data.customer.name}</p>
          {data.customer.email && <p className="text-[var(--color-ink-soft)] [overflow-wrap:anywhere]">{data.customer.email}</p>}
          {data.customer.phone && <p className="text-[var(--color-ink-soft)]">{data.customer.phone}</p>}
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className={LABEL}>Deliver to</p>
          {data.deliverTo.length ? (
            <p className="text-[var(--color-ink-soft)]">
              {data.deliverTo.map((line, i) => <span key={i} className="block">{line}</span>)}
            </p>
          ) : <p className="text-[var(--color-ink-soft)]">—</p>}
        </div>
      </section>

      {/* Items */}
      <div className="mt-8 overflow-hidden rounded-lg border border-[var(--color-border)]">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--color-parchment-warm)] text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-muted)] text-left">
              <th className="font-semibold px-4 py-3">Item</th>
              <th className="font-semibold px-2 py-3 text-center w-14">Qty</th>
              <th className="font-semibold px-2 py-3 text-right w-28 hidden sm:table-cell print:table-cell">Unit price</th>
              <th className="font-semibold px-4 py-3 text-right w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="border-t border-[var(--color-border)] align-top">
                <td className="px-4 py-3.5">
                  <p className="font-medium">{item.product_name_snapshot}</p>
                  <p className="text-[var(--color-ink-soft)] text-xs">{item.variant_name_snapshot}</p>
                </td>
                <td className="px-2 py-3.5 text-center tabular-nums">{item.quantity}</td>
                <td className="px-2 py-3.5 text-right tabular-nums hidden sm:table-cell print:table-cell">{formatUsd(item.unit_price_usd_cents)}</td>
                <td className="px-4 py-3.5 text-right tabular-nums font-medium">{formatUsd(item.line_total_usd_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-[var(--color-ink-muted)]">{itemCount} item{itemCount === 1 ? '' : 's'} · prices in US dollars</p>

      {/* Totals */}
      <div className="flex items-center justify-between gap-6 mt-6">
        {paid ? (
          <div aria-hidden="true" className="hidden sm:block print:block shrink-0 -rotate-[10deg] select-none pl-4">
            <div className="rounded-full border-[3px] border-[var(--color-forest)]/25 p-1">
              <div className="flex h-[104px] w-[104px] flex-col items-center justify-center rounded-full border border-[var(--color-forest)]/25 text-[var(--color-forest)]/40">
                <span className="text-[7.5px] font-semibold tracking-[0.22em]">GLOBALGETWEST</span>
                <span className="font-display text-[28px] leading-none tracking-wide my-1">PAID</span>
                <span className="text-[7.5px] font-semibold tracking-[0.22em] tabular-nums">{data.payment.paidAt ? new Date(data.payment.paidAt).toISOString().slice(0, 10) : ''}</span>
              </div>
            </div>
          </div>
        ) : <span />}
        <dl className="w-full sm:w-[22rem] space-y-2">
          <div className="flex justify-between">
            <dt className="text-[var(--color-ink-soft)]">Subtotal</dt>
            <dd className="tabular-nums">{formatUsd(data.subtotalUsdCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-ink-soft)]">
              Delivery{data.shippingService && <span className="text-[var(--color-ink-muted)]"> · {data.shippingService}</span>}
            </dt>
            <dd className="tabular-nums">{data.shippingUsdCents === 0 ? 'Free' : formatUsd(data.shippingUsdCents)}</dd>
          </div>
          {data.taxUsdCents > 0 && (
            <div className="flex justify-between">
              <dt className="text-[var(--color-ink-soft)]">Tax</dt>
              <dd className="tabular-nums">{formatUsd(data.taxUsdCents)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-[var(--color-border)] pt-2">
            <dt className="font-medium">Total (USD)</dt>
            <dd className="font-medium tabular-nums">{formatUsd(data.totalUsdCents)}</dd>
          </div>
          <div className="flex justify-between items-baseline rounded-lg bg-[var(--color-forest)] text-white px-4 py-3 mt-3">
            <dt className="font-semibold text-[13px]">{paid ? 'Amount paid' : 'Amount due'}</dt>
            <dd className="font-display text-[26px] leading-none tabular-nums">{totalLabel}</dd>
          </div>
          {data.charge.currency !== 'USD' && (
            <p className="text-right text-[11px] text-[var(--color-ink-muted)]">
              Converted at 1 USD = {data.charge.rate.toLocaleString('en-US', { maximumFractionDigits: 4 })} {data.charge.currency}
            </p>
          )}
        </dl>
      </div>

      {/* Payment details (paid) */}
      {paid && (
        <section className="mt-9 grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-parchment-warm)] px-5 py-4">
          <div>
            <p className={LABEL}>Payment method</p>
            <p className="font-medium">{data.payment.method}</p>
          </div>
          <div>
            <p className={LABEL}>Transaction reference</p>
            <p className="font-medium break-all tabular-nums">{data.payment.reference}</p>
          </div>
          <div>
            <p className={LABEL}>Payment status</p>
            <p className="font-medium text-[var(--color-forest)]">Received in full</p>
          </div>
        </section>
      )}

      {/* How to pay (awaiting payment) */}
      {pending && (
        <section className="mt-9 rounded-lg border border-[var(--color-border)] p-6">
          <p className="font-display text-xl mb-4">How to pay</p>
          {data.charge.hasOnlinePayment ? (
            <p className="text-[var(--color-ink-soft)]">
              This order is being paid online. If your payment didn&apos;t complete, contact us at {SUPPORT_EMAIL} with
              your invoice number.
            </p>
          ) : (
            <>
              <div className="grid sm:grid-cols-3 gap-4 mb-5">
                <div>
                  <p className={LABEL}>Method</p>
                  <p className="font-medium">{METHOD_LABEL[data.method]}</p>
                </div>
                <div>
                  <p className={LABEL}>Amount due</p>
                  <p className="font-semibold tabular-nums">{totalLabel}</p>
                </div>
                <div>
                  <p className={LABEL}>{data.method === 'western_union' ? 'Your reference' : 'Payment reference'}</p>
                  <p className="font-semibold">{data.orderNumber}</p>
                </div>
              </div>
              <ol className="space-y-3">
                {paymentSteps(data.method, { amount: totalLabel, reference: data.orderNumber, contactName: data.stepContactName }).map((step, i) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-[var(--color-forest)] text-white text-[11px] font-semibold inline-flex items-center justify-center">
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
                <p className={`${LABEL} mb-2`}>Official contacts</p>
                <ul className="space-y-1">
                  {data.contacts.map((c) => (
                    <li key={c.phone} className="flex flex-wrap justify-between gap-x-4">
                      <span className="text-[var(--color-ink-soft)]">{c.name}</span>
                      <span className="font-medium whitespace-nowrap">{c.phone} · {c.how}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] text-[var(--color-ink-muted)]">{methodNote(data.method)}</p>
              </div>
            </>
          )}
        </section>
      )}

      {/* Verification + thanks */}
      <section className="mt-10 flex flex-col-reverse sm:flex-row items-start sm:items-center justify-between gap-6 pt-7 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <div
            className="h-[84px] w-[84px] shrink-0 rounded-md border border-[var(--color-border)] bg-white p-1.5 [&>svg]:h-full [&>svg]:w-full"
            role="img"
            aria-label="QR code to verify this document"
            dangerouslySetInnerHTML={{ __html: data.qrSvg }}
          />
          <div>
            <p className="font-semibold text-[12px] text-[var(--color-forest)] flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Verified digital document
            </p>
            <p className="text-[11px] text-[var(--color-ink-soft)] leading-snug mt-0.5">
              Scan to confirm this {paid ? 'receipt' : 'invoice'} was issued by GLOBALGETWEST.
            </p>
            <p className="text-[10.5px] text-[var(--color-ink-muted)] mt-0.5 break-all">{data.verifyHref.replace(/^https?:\/\//, '')}</p>
          </div>
        </div>
        <p className="font-display text-lg text-[var(--color-ink)] sm:text-right">
          {paid ? 'Thank you for your order.' : pending ? 'Thank you for choosing GLOBALGETWEST.' : 'This order is closed.'}
        </p>
      </section>

      <footer className="mt-8 pt-5 border-t border-[var(--color-border)] text-center text-[11px] text-[var(--color-ink-muted)] space-y-1">
        <p>
          {pending
            ? 'This is a pro-forma invoice. Your receipt is issued once payment is confirmed.'
            : `Questions about this ${paid ? 'receipt' : 'invoice'}? Write to ${SUPPORT_EMAIL} and quote ${data.orderNumber}.`}
        </p>
        <p>GLOBALGETWEST · www.globalgetwest.com</p>
      </footer>
    </article>
  );
}
