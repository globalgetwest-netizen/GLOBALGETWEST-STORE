// lib/payments/handleWebhookEvent.ts
// Common logic after a gateway's webhook has been verified and normalized —
// update the payment row, flip the order to 'paid', log an audit event,
// and record an inventory 'sale' movement. Shared across stripe/flutterwave/grey
// route handlers so order-state logic lives in exactly one place.

import { supabaseServiceRole } from '../supabase/server';
import { logOrderEvent } from '../orders';
import { syncOrderStock } from '../inventory';
import { sendOrderEmail } from '../orderEmails';
import type { VerifiedPaymentEvent } from './types';

export async function handleWebhookEvent(event: VerifiedPaymentEvent) {
  const supabase = supabaseServiceRole();

  const { data: payment, error: paymentLookupError } = await supabase
    .from('payments')
    .select('id, order_id, status, currency, amount_minor_units')
    .eq('gateway', event.gateway)
    .eq('gateway_reference', event.gatewayReference)
    .single();

  if (paymentLookupError || !payment) {
    // Nothing we recognize — log and ignore rather than throw, so the
    // gateway doesn't retry forever on an event we'll never match.
    console.error(`No matching payment for ${event.gateway}/${event.gatewayReference}`);
    return;
  }

  // Idempotency guard — webhooks can arrive more than once.
  if (payment.status === 'succeeded') return;

  // A "successful" payment only counts if it paid what we actually asked
  // for, in the currency we asked for. Grey settles in USDC against a USD
  // charge (1:1), so treat those as the same currency.
  if (event.status === 'succeeded') {
    const paidCurrency = event.currency.toUpperCase() === 'USDC' ? 'USD' : event.currency.toUpperCase();
    const expectedAmount = Number(payment.amount_minor_units);
    if (paidCurrency !== payment.currency.toUpperCase() || event.amountMinorUnits < expectedAmount) {
      await supabase
        .from('payments')
        .update({ status: 'failed', raw_webhook_payload: event.rawPayload })
        .eq('id', payment.id);
      await logOrderEvent(
        payment.order_id,
        'note_added',
        `Payment via ${event.gateway} NOT accepted: paid ${event.amountMinorUnits} ${event.currency}, `
          + `expected ${expectedAmount} ${payment.currency} (${event.gatewayReference}). Review manually.`,
      );
      return;
    }
  }

  await supabase
    .from('payments')
    .update({
      status: event.status,
      raw_webhook_payload: event.rawPayload,
    })
    .eq('id', payment.id);

  if (event.status !== 'succeeded') {
    await logOrderEvent(payment.order_id, 'status_changed', `Payment ${event.status} via ${event.gateway}`);
    return;
  }

  await supabase
    .from('orders')
    .update({ status: 'paid' })
    .eq('id', payment.order_id);

  await logOrderEvent(payment.order_id, 'payment_confirmed', `Confirmed via ${event.gateway} (${event.gatewayReference})`);

  // Deduct stock once — shared with admin/staff status changes so an order
  // is never deducted twice (see lib/inventory.ts).
  await syncOrderStock(payment.order_id, 'paid');

  // Never throws; does nothing until email is switched on.
  await sendOrderEmail(payment.order_id, 'paid');
}
