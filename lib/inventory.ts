// lib/inventory.ts
// Keeps the stock ledger (inventory_movements) in step with an order's
// status. Rule: an order's items are deducted exactly once while the order
// counts as paid (paid → delivered), and put back if it later becomes
// cancelled, refunded or pending again. Safe to call on every status change
// — from the payment webhook, the admin panel or the staff portal — because
// it looks at what has already been recorded for the order first.
import { supabaseServiceRole } from './supabase/server';
import { PAID_STATUSES } from './orderCharge';
import { logOrderEvent } from './orders';

export async function syncOrderStock(orderId: string, status: string, actorId?: string | null): Promise<void> {
  const svc = supabaseServiceRole();

  const { data: moves, error: movesError } = await svc
    .from('inventory_movements')
    .select('quantity_change')
    .eq('reference_order_id', orderId)
    .in('reason', ['sale', 'return']);
  if (movesError) throw movesError;

  // Net effect so far: negative = this order's items are currently deducted.
  const net = (moves ?? []).reduce((sum, m) => sum + Number(m.quantity_change), 0);
  const shouldBeDeducted = PAID_STATUSES.includes(status);

  if (shouldBeDeducted === (net < 0)) return; // already in the right state

  const { data: items, error: itemsError } = await svc
    .from('order_items')
    .select('variant_id, quantity')
    .eq('order_id', orderId);
  if (itemsError) throw itemsError;
  if (!items?.length) return;

  const units = items.reduce((sum, i) => sum + i.quantity, 0);
  const { error: insertError } = await svc.from('inventory_movements').insert(
    items.map((item) => ({
      variant_id: item.variant_id,
      quantity_change: shouldBeDeducted ? -item.quantity : item.quantity,
      reason: shouldBeDeducted ? ('sale' as const) : ('return' as const),
      reference_order_id: orderId,
      note: shouldBeDeducted ? `Order ${status}` : `Order ${status} — stock put back`,
      created_by: actorId ?? null,
    })),
  );
  if (insertError) throw insertError;

  await logOrderEvent(
    orderId,
    'note_added',
    shouldBeDeducted
      ? `Stock deducted: ${units} unit${units === 1 ? '' : 's'}`
      : `Stock restored: ${units} unit${units === 1 ? '' : 's'} (order ${status})`,
    actorId ?? null,
  );
}

