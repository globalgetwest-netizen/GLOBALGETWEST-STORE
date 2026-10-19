// app/orders/[id]/invoice/page.tsx
// Printable invoice / receipt for an order (see components/InvoiceDocument).
// Customers save it as a PDF with the browser's print dialog. RLS limits it
// to the customer who placed the order, plus staff and admins.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseServerClient } from '@/lib/supabase/server';
import { getOrderCharge, PAID_STATUSES } from '@/lib/orderCharge';
import { getReceiptPayment, qrSvg, verifyUrl } from '@/lib/receipt';
import { COUNTRIES } from '@/lib/countries';
import { contactForCountry, westernUnionDesk } from '@/lib/contact';
import { isManualMethod, type ManualMethod } from '@/lib/paymentMethods';
import { PrintButton } from '@/components/PrintButton';
import { InvoiceDocument, type InvoiceItem } from '@/components/InvoiceDocument';

export const metadata: Metadata = {
  title: 'Invoice — GLOBALGETWEST',
  robots: { index: false, follow: false },
};

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
  if (!order) notFound();

  const [{ data: itemRows }, { data: address }, charge, payment] = await Promise.all([
    supabase.from('order_items').select('*').eq('order_id', id),
    order.shipping_address_id
      ? supabase
        .from('addresses')
        .select('full_name, phone, line1, line2, city, region, postal_code, country_code')
        .eq('id', order.shipping_address_id)
        .maybeSingle()
      : Promise.resolve({ data: null }),
    getOrderCharge(supabase, order),
    getReceiptPayment(supabase, order),
  ]);

  // Guests' email is on the order; registered customers' is on their account.
  let email: string | null = order.contact_email ?? null;
  if (!email && user && user.id === order.customer_id) email = user.email ?? null;
  if (!email) {
    const { data: profile } = await supabase.from('profiles').select('email').eq('id', order.customer_id).maybeSingle();
    email = profile?.email ?? null;
  }

  const paid = PAID_STATUSES.includes(order.status);
  const state = paid ? 'paid' : order.status === 'cancelled' ? 'cancelled' : order.status === 'refunded' ? 'refunded' : 'pending';
  const country = COUNTRIES.find((c) => c.code === address?.country_code)?.name ?? address?.country_code ?? '';
  // The invoice is the customer's own document, so it prints their
  // agent's number in full — including the Africa agent's.
  const contact = contactForCountry(order.shipping_country_code ?? address?.country_code ?? '');
  const method: ManualMethod = isManualMethod(order.payment_method) ? order.payment_method : 'bank_transfer';
  const wuDesk = method === 'western_union' ? westernUnionDesk(contact) : undefined;
  const verifyHref = verifyUrl(order.id);

  return (
    <div className="mx-auto max-w-[880px] px-4 py-10 print:p-0 print:max-w-none">
      {/* Toolbar — screen only */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <Link href={`/orders/${order.id}/success`} className="focus-ring text-sm text-[var(--color-forest)] font-medium hover:underline">
          ← Back to order
        </Link>
        <PrintButton label={`Download ${paid ? 'receipt' : 'invoice'} (PDF)`} />
      </div>

      <InvoiceDocument
        data={{
          orderNumber: order.order_number,
          createdAt: order.created_at,
          state,
          subtotalUsdCents: order.subtotal_usd_cents,
          shippingUsdCents: order.shipping_usd_cents,
          taxUsdCents: order.tax_usd_cents,
          totalUsdCents: order.total_usd_cents,
          shippingService: order.shipping_service,
          items: (itemRows ?? []) as InvoiceItem[],
          customer: { name: address?.full_name ?? 'Customer', email, phone: address?.phone ?? null },
          deliverTo: address
            ? [
              [address.line1, address.line2].filter(Boolean).join(', '),
              [address.city, address.region, address.postal_code].filter(Boolean).join(', '),
              country,
            ].filter(Boolean)
            : [],
          charge,
          payment,
          method,
          stepContactName: wuDesk ? 'Our Western Union desk' : `Your ${contact.label} agent`,
          contacts: wuDesk
            ? [{ name: 'Western Union desk', phone: wuDesk.display, how: 'call or WhatsApp' }]
            : [{ name: `${contact.label} agent`, phone: contact.display, how: 'WhatsApp' }],
          qrSvg: await qrSvg(verifyHref),
          verifyHref,
        }}
      />
    </div>
  );
}
