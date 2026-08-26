// lib/orders.ts
import { supabaseServiceRole } from './supabase/server';

export function generateOrderNumber(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `GGW-${rand}`;
}

/**
 * Records an order_event row. Called from webhook handlers and staff/admin
 * actions so every state change has an audit trail.
 */
export async function logOrderEvent(
  orderId: string,
  eventType:
    | 'created' | 'payment_confirmed' | 'status_changed' | 'note_added'
    | 'assigned' | 'shipped' | 'cancelled' | 'refunded',
  detail?: string,
  createdBy?: string | null,
) {
  const supabase = supabaseServiceRole();
  const { error } = await supabase.from('order_events').insert({
    order_id: orderId,
    event_type: eventType,
    detail: detail ?? null,
    created_by: createdBy ?? null,
  });
  if (error) throw error;
}
