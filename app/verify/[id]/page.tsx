// app/verify/[id]/page.tsx
// Where a receipt's QR code leads. Confirms the document was issued by
// GLOBALGETWEST and shows only what is printed in its header and totals —
// number, dates, status and amount. Never names, addresses, contact details
// or items, so a scanned receipt reveals nothing personal. The id is the
// order's random UUID, which can't be guessed.
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { supabaseServiceRole } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/format';
import { getOrderCharge, PAID_STATUSES } from '@/lib/orderCharge';
import { getReceiptPayment } from '@/lib/receipt';

export const metadata: Metadata = {
  title: 'Verify a document — GLOBALGETWEST',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export default async function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const svc = supabaseServiceRole();
  const { data: order } = UUID_RE.test(id)
    ? await svc
      .from('orders')
      .select('id, order_number, status, currency, total_usd_cents, created_at, payment_method')
      .eq('id', id)
      .maybeSingle()
    : { data: null };

  if (!order) {
    return (
      <Shell>
        <div className="flex items-center gap-3 rounded-lg border border-[var(--color-danger)]/25 bg-[var(--color-danger)]/[0.05] px-5 py-4">
          <StatusIcon ok={false} />
          <div>
            <p className="font-semibold text-[var(--color-danger)]">Document not found</p>
            <p className="text-sm text-[var(--color-ink-soft)]">
              We have no record of this document. It may have been altered — please contact us before relying on it.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  const [charge, payment] = await Promise.all([getOrderCharge(svc, order), getReceiptPayment(svc, order)]);
  const paid = PAID_STATUSES.includes(order.status);
  const closed = order.status === 'cancelled' || order.status === 'refunded';
  const docType = paid ? 'Receipt' : closed ? 'Invoice' : 'Pro-forma invoice';
  const statusText = paid ? 'Paid in full' : closed ? (order.status === 'refunded' ? 'Refunded' : 'Cancelled') : 'Awaiting payment';

  const rows: [string, string][] = [
    ['Document', `${docType} No. ${order.order_number}`],
    ['Issued', formatDate(order.created_at)],
    ['Status', statusText],
    [paid ? 'Amount paid' : 'Amount', formatMoney(charge.amountMinorUnits, charge.currency)],
    ...(paid && payment.paidAt ? [['Paid on', formatDate(payment.paidAt)] as [string, string]] : []),
  ];

  return (
    <Shell>
      <div className="flex items-center gap-3 rounded-lg border border-[var(--color-forest)]/20 bg-[var(--color-forest)]/[0.05] px-5 py-4 mb-6">
        <StatusIcon ok />
        <div>
          <p className="font-semibold text-[var(--color-forest)]">Genuine GLOBALGETWEST document</p>
          <p className="text-sm text-[var(--color-ink-soft)]">This document was issued by GLOBALGETWEST and matches our records.</p>
        </div>
      </div>
      <dl className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-5 py-3 text-sm">
            <dt className="text-[var(--color-ink-soft)]">{k}</dt>
            <dd className="font-medium text-right tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-xs text-[var(--color-ink-muted)] leading-relaxed">
        Check that these details match the document in your hands. For privacy, names, addresses and items are never shown here.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[520px] px-4 py-12 sm:py-16">
      <div className="text-center mb-7">
        <Image src="/logo.png" alt="" width={52} height={52} className="mx-auto rounded-full mb-4" priority />
        <p className="uppercase tracking-[0.2em] text-[var(--color-forest)] text-[11px] font-semibold mb-2">Document verification</p>
        <h1 className="font-display text-3xl">GLOBALGETWEST</h1>
      </div>
      <div className="form-card p-6 sm:p-8">{children}</div>
      <p className="mt-6 text-center text-sm text-[var(--color-ink-soft)]">
        Questions? <Link href="/contact" className="focus-ring text-[var(--color-forest)] font-semibold hover:underline">Contact us</Link>
      </p>
    </div>
  );
}

function StatusIcon({ ok }: { ok: boolean }) {
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-[var(--color-forest)] text-white' : 'bg-[var(--color-danger)] text-white'}`}>
      {ok ? (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
      )}
    </span>
  );
}
