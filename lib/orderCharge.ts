// lib/orderCharge.ts
// What a customer is (or was) actually charged for an order, in the
// currency they pay in. Shared by the order page and the invoice so both
// always show the same figure.
import type { SupabaseClient } from '@supabase/supabase-js';

export interface OrderCharge {
  currency: string;
  /** Total in the charge currency's minor units (pesewas, kobo, cents). */
  amountMinorUnits: number;
  /** USD → charge currency rate behind amountMinorUnits (1 for USD). */
  rate: number;
  /** True when there's an online payment attempt (Paystack etc.). */
  hasOnlinePayment: boolean;
}

export async function getOrderCharge(
  supabase: SupabaseClient,
  order: { id: string; currency: string; total_usd_cents: number },
): Promise<OrderCharge> {
  const { data: payment } = await supabase
    .from('payments')
    .select('currency, amount_minor_units')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // An online payment records the exact amount sent to the gateway.
  if (payment) {
    const amount = Number(payment.amount_minor_units);
    return {
      currency: payment.currency,
      amountMinorUnits: amount,
      rate: order.total_usd_cents ? amount / order.total_usd_cents : 1,
      hasOnlinePayment: true,
    };
  }

  if (order.currency === 'USD') {
    return { currency: 'USD', amountMinorUnits: order.total_usd_cents, rate: 1, hasOnlinePayment: false };
  }

  // Agent-arranged payment in a local currency: convert with the latest
  // rate, the same way /api/checkout does.
  const { data: fx } = await supabase
    .from('fx_rates')
    .select('rate')
    .eq('base_currency', 'USD')
    .eq('quote_currency', order.currency)
    .order('effective_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!fx) {
    return { currency: 'USD', amountMinorUnits: order.total_usd_cents, rate: 1, hasOnlinePayment: false };
  }
  const rate = Number(fx.rate);
  return {
    currency: order.currency,
    amountMinorUnits: Math.round(order.total_usd_cents * rate),
    rate,
    hasOnlinePayment: false,
  };
}

export const PAID_STATUSES = ['paid', 'processing', 'fulfilled', 'shipped', 'delivered'];
