// lib/orderEmails.ts
// Customer emails for an order's key moments:
//   placed  — agent-assisted orders (bank transfer / Western Union): order
//             number, total and how payment works
//   paid    — payment received (gateway webhook or confirmed by staff)
//   shipped — on its way
// Each email is sent at most once per order (recorded in order_events), and
// nothing happens until BREVO_API_KEY is set (see lib/email.ts). Never
// throws — callers fire it after the response with next/server `after()`.
import { supabaseServiceRole } from './supabase/server';
import { emailEnabled, esc, sendEmail } from './email';
import { logOrderEvent } from './orders';
import { formatMoney, formatUsd } from './format';
import { contactForCountry, SUPPORT_EMAIL, westernUnionDesk, whatsappLink } from './contact';
import { isManualMethod, METHOD_LABEL } from './paymentMethods';

export type OrderEmailKind = 'placed' | 'paid' | 'shipped';

const SENT_LABEL: Record<OrderEmailKind, string> = {
  placed: 'Email sent: order received',
  paid: 'Email sent: payment received',
  shipped: 'Email sent: order shipped',
};

/** Which email (if any) a new order status should trigger. */
export function emailForStatus(status: string): OrderEmailKind | null {
  if (status === 'paid') return 'paid';
  if (status === 'shipped') return 'shipped';
  return null;
}

export async function sendOrderEmail(orderId: string, kind: OrderEmailKind): Promise<void> {
  if (!emailEnabled()) return;
  try {
    const svc = supabaseServiceRole();

    // Once per order and kind — webhooks retry and staff can re-save a status.
    const { data: already } = await svc
      .from('order_events')
      .select('id')
      .eq('order_id', orderId)
      .eq('detail', SENT_LABEL[kind])
      .limit(1);
    if (already?.length) return;

    const { data: order } = await svc
      .from('orders')
      .select('id, order_number, customer_id, currency, subtotal_usd_cents, shipping_usd_cents, total_usd_cents, contact_email, payment_method, shipping_carrier, shipping_service, shipping_country_code, shipping_address_id')
      .eq('id', orderId)
      .maybeSingle();
    if (!order) return;

    const [{ data: items }, { data: profile }, { data: address }, { data: payment }] = await Promise.all([
      svc.from('order_items').select('product_name_snapshot, variant_name_snapshot, quantity, line_total_usd_cents').eq('order_id', orderId),
      svc.from('profiles').select('full_name, email').eq('id', order.customer_id).maybeSingle(),
      order.shipping_address_id
        ? svc.from('addresses').select('full_name, line1, line2, city, region, country_code').eq('id', order.shipping_address_id).maybeSingle()
        : Promise.resolve({ data: null }),
      svc.from('payments').select('currency, amount_minor_units').eq('order_id', orderId).eq('status', 'succeeded').limit(1).maybeSingle(),
    ]);

    let to = order.contact_email || profile?.email || null;
    if (!to) {
      const { data: authUser } = await svc.auth.admin.getUserById(order.customer_id);
      to = authUser?.user?.email ?? null;
    }
    if (!to) return; // No address on file (e.g. a phone-only order).

    const name = address?.full_name || profile?.full_name || '';
    const email = buildEmail(kind, {
      orderId: order.id,
      orderNumber: order.order_number,
      firstName: name.split(' ')[0] || 'there',
      items: items ?? [],
      subtotal: order.subtotal_usd_cents,
      shipping: order.shipping_usd_cents,
      total: order.total_usd_cents,
      charged: payment && payment.currency !== 'USD' ? formatMoney(payment.amount_minor_units, payment.currency) : null,
      method: isManualMethod(order.payment_method) ? order.payment_method : null,
      countryCode: order.shipping_country_code ?? address?.country_code ?? '',
      delivery: [order.shipping_carrier, order.shipping_service].filter(Boolean).join(' '),
      address: address
        ? [address.full_name, address.line1, address.line2, address.city, address.region].filter(Boolean).join(', ')
        : '',
    });

    const sent = await sendEmail({ to: { email: to, name: name || undefined }, ...email });
    if (sent) await logOrderEvent(orderId, 'note_added', SENT_LABEL[kind]);
  } catch (err) {
    console.error(`Order email (${kind}) failed`, err instanceof Error ? err.name : 'unknown error');
  }
}

// ---------------------------------------------------------------- templates

type Ctx = {
  orderId: string;
  orderNumber: string;
  firstName: string;
  items: { product_name_snapshot: string; variant_name_snapshot: string; quantity: number; line_total_usd_cents: number }[];
  subtotal: number;
  shipping: number;
  total: number;
  charged: string | null;
  method: 'bank_transfer' | 'western_union' | null;
  countryCode: string;
  delivery: string;
  address: string;
};

const NAVY = '#0F2A45';
const GOLD = '#C08A34';
const INK = '#111111';
const SOFT = '#5F5F5F';
const BORDER = '#E8E8E8';

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.globalgetwest.com').replace(/\/$/, '');
}

/** Exported for previews and tests. */
export function buildEmail(kind: OrderEmailKind, c: Ctx): { subject: string; html: string; text: string } {
  const orderUrl = `${siteUrl()}/orders/${c.orderId}/success`;
  const invoiceUrl = `${siteUrl()}/orders/${c.orderId}/invoice`;
  const totalLabel = c.charged ? `${c.charged} (${formatUsd(c.total)})` : formatUsd(c.total);

  let subject: string;
  let heading: string;
  let intro: string;
  let extraHtml = '';
  let extraText = '';

  if (kind === 'placed') {
    const contact = contactForCountry(c.countryCode);
    const wuDesk = westernUnionDesk(contact);
    const agent = c.method === 'western_union' && wuDesk ? wuDesk : contact.agents[0];
    const methodName = c.method ? METHOD_LABEL[c.method] : 'your chosen method';
    const waUrl = whatsappLink(agent.whatsapp, `Hello, I'd like to pay for order ${c.orderNumber} by ${methodName}.`);
    subject = `Order ${c.orderNumber} received — next step: payment`;
    heading = 'Thank you — your order is reserved';
    intro = `We've received order ${c.orderNumber}. You chose to pay by ${methodName}, so our ${contact.label} agent will contact you on WhatsApp with the payment details. You can also message them now.`;
    extraHtml = button(waUrl, `Message our agent on WhatsApp (${agent.display})`)
      + `<p style="margin:12px 0 0;font-size:13px;color:${SOFT}">Please quote <strong style="color:${INK}">${esc(c.orderNumber)}</strong> as your payment reference. We'll email you as soon as your payment is confirmed.</p>`;
    extraText = `Message our agent on WhatsApp: ${agent.display} (${waUrl})\nPlease quote ${c.orderNumber} as your payment reference.`;
  } else if (kind === 'paid') {
    subject = `Payment received — order ${c.orderNumber}`;
    heading = 'Payment received';
    intro = `Thank you, ${c.firstName}. We've received your payment for order ${c.orderNumber} and are now preparing it for delivery. We'll email you again when it ships.`;
    extraHtml = button(invoiceUrl, 'View your receipt');
    extraText = `Receipt: ${invoiceUrl}`;
  } else {
    subject = `Your order ${c.orderNumber} is on its way`;
    heading = 'Your order has shipped';
    intro = `Good news, ${c.firstName} — order ${c.orderNumber} has left us${c.delivery ? ` with ${c.delivery}` : ''}.`;
    extraHtml = button(orderUrl, 'View your order')
      + (c.address ? `<p style="margin:12px 0 0;font-size:13px;color:${SOFT}">Delivering to: ${esc(c.address)}</p>` : '');
    extraText = `View your order: ${orderUrl}${c.address ? `\nDelivering to: ${c.address}` : ''}`;
  }

  const rows = c.items.map((i) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${BORDER};font-size:14px;color:${INK}">
            ${esc(i.product_name_snapshot)}<br><span style="font-size:12px;color:${SOFT}">${esc(i.variant_name_snapshot)} × ${i.quantity}</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid ${BORDER};font-size:14px;color:${INK};text-align:right;white-space:nowrap">${formatUsd(i.line_total_usd_cents)}</td>
        </tr>`).join('');

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#F4F4F2;font-family:Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F2;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid ${BORDER};border-radius:8px">
        <tr><td style="padding:24px 28px;border-bottom:3px solid ${GOLD}">
          <span style="font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:1px;color:${NAVY};font-weight:bold">GLOBALGETWEST</span>
        </td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:normal;color:${INK}">${esc(heading)}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${INK}">${esc(intro)}</p>
          ${extraHtml}
          <p style="margin:28px 0 8px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${SOFT}">Order ${esc(c.orderNumber)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
            <tr><td style="padding:10px 0 2px;font-size:13px;color:${SOFT}">Subtotal</td><td style="padding:10px 0 2px;font-size:13px;color:${SOFT};text-align:right">${formatUsd(c.subtotal)}</td></tr>
            <tr><td style="padding:2px 0 10px;font-size:13px;color:${SOFT}">Delivery</td><td style="padding:2px 0 10px;font-size:13px;color:${SOFT};text-align:right">${c.shipping === 0 ? 'Free' : formatUsd(c.shipping)}</td></tr>
            <tr><td style="padding:12px 0 0;border-top:1px solid ${BORDER};font-size:15px;font-weight:bold;color:${INK}">Total</td><td style="padding:12px 0 0;border-top:1px solid ${BORDER};font-size:15px;font-weight:bold;color:${INK};text-align:right">${esc(totalLabel)}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:18px 28px;background:#FAFAF8;border-top:1px solid ${BORDER};border-radius:0 0 8px 8px;font-size:12px;line-height:1.6;color:${SOFT}">
          Questions? Reply to this email or write to <a href="mailto:${SUPPORT_EMAIL}" style="color:${NAVY}">${SUPPORT_EMAIL}</a>.<br>
          © ${new Date().getFullYear()} GLOBALGETWEST · <a href="${siteUrl()}" style="color:${NAVY}">globalgetwest.com</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    'GLOBALGETWEST',
    '',
    heading,
    '',
    intro,
    '',
    extraText,
    '',
    `Order ${c.orderNumber}`,
    ...c.items.map((i) => `- ${i.product_name_snapshot} (${i.variant_name_snapshot}) × ${i.quantity}: ${formatUsd(i.line_total_usd_cents)}`),
    `Subtotal: ${formatUsd(c.subtotal)}`,
    `Delivery: ${c.shipping === 0 ? 'Free' : formatUsd(c.shipping)}`,
    `Total: ${totalLabel}`,
    '',
    `Questions? Reply to this email or write to ${SUPPORT_EMAIL}.`,
  ].join('\n');

  return { subject, html, text };
}

function button(href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;background:${INK};color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 22px;border-radius:4px">${esc(label)}</a>`;
}
