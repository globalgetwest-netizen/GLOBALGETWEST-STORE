// lib/receipt.ts
// Details printed on a paid receipt (when, how, reference) and the QR code
// that lets anyone confirm a GLOBALGETWEST receipt is genuine at /verify.
import type { SupabaseClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import { isManualMethod, METHOD_LABEL } from './paymentMethods';

const GATEWAY_LABEL: Record<string, string> = {
  paystack: 'Card / Mobile Money (Paystack)',
  flutterwave: 'Card / Bank (Flutterwave)',
  stripe: 'Card (Stripe)',
  grey: 'Bank transfer (Grey)',
};

export interface ReceiptPayment {
  /** When the order became paid; null while unpaid. */
  paidAt: string | null;
  method: string;
  /** Gateway transaction id, or the order number for agent-arranged payments. */
  reference: string;
}

export async function getReceiptPayment(
  supabase: SupabaseClient,
  order: { id: string; order_number: string; payment_method: string | null },
): Promise<ReceiptPayment> {
  const [{ data: payment }, { data: events }] = await Promise.all([
    supabase
      .from('payments')
      .select('gateway, gateway_reference, created_at')
      .eq('order_id', order.id)
      .eq('status', 'succeeded')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('order_events')
      .select('event_type, detail, created_at')
      .eq('order_id', order.id)
      .or('event_type.eq.payment_confirmed,detail.eq.Status set to paid')
      .order('created_at', { ascending: true })
      .limit(1),
  ]);

  const paidAt = events?.[0]?.created_at ?? null;
  if (payment) {
    return {
      paidAt,
      method: GATEWAY_LABEL[payment.gateway] ?? payment.gateway,
      reference: payment.gateway_reference,
    };
  }
  return {
    paidAt,
    method: isManualMethod(order.payment_method) ? METHOD_LABEL[order.payment_method] : 'Arranged with our agent',
    reference: order.order_number,
  };
}

export function verifyUrl(orderId: string): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.globalgetwest.com').replace(/\/$/, '');
  return `${site}/verify/${orderId}`;
}

/** Crisp, print-safe SVG QR code in the brand navy. */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 0,
    color: { dark: '#0F2A45', light: '#FFFFFF' },
  });
}
