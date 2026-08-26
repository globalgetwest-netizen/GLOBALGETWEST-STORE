// lib/payments/handleWebhookEvent.ts
// Common logic after a gateway's webhook has been verified and normalized —
// update the payment row, flip the order to 'paid', log an audit event,
// and record an inventory 'sale' movement. Shared across stripe/flutterwave/grey
// route handlers so order-state logic lives in exactly one place.

import { supabaseServiceRole } from '../supabase/server';
import { logOrderEvent } from '../orders';
import type { VerifiedPaymentEvent } from './types';

export async function handleWebhookEvent(event: VerifiedPaymentEvent) {
  const supabase = supabaseServiceRole();

  const { data: payment, error: paymentLookupError } = await supabase
    .from('payments')
    .select('id, order_id, status')
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

  await supabase
    .from('payments')
    .update({
      status: event.status,
      raw_webhook_payload: event.rawPayload as any,
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

  // Deduct stock for each line item — append-only ledger, see inventory_movements.
  const { data: items } = await supabase
    .from('order_items')
    .select('variant_id, quantity')
    .eq('order_id', payment.order_id);

  if (items?.length) {
    const movements = items.map((item) => ({
      variant_id: item.variant_id,
      quantity_change: -item.quantity,
      reason: 'sale' as const,
      reference_order_id: payment.order_id,
    }));
    await supabase.from('inventory_movements').insert(movements);
  }
}
