// app/api/admin/orders/[id]/route.ts
import { NextRequest, NextResponse, after } from 'next/server';
import { supabaseServerClient } from '@/lib/supabase/server';
import { logOrderEvent } from '@/lib/orders';
import { syncOrderStock } from '@/lib/inventory';
import { emailForStatus, sendOrderEmail } from '@/lib/orderEmails';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const { status, assigned_staff_id, note } = body as {
    status?: string; assigned_staff_id?: string | null; note?: string;
  };

  let stockWarning: string | undefined;
  if (status) {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logOrderEvent(id, 'status_changed', `Status set to ${status}`, user.id);
    const emailKind = emailForStatus(status);
    if (emailKind) after(() => sendOrderEmail(id, emailKind));
    // Keep stock in step: deduct when the order becomes paid (e.g. a bank
    // transfer or Western Union payment confirmed by hand), put it back if
    // it's cancelled or refunded. Never blocks the status change itself.
    try {
      await syncOrderStock(id, status, user.id);
    } catch (err) {
      console.error('Stock sync failed for order', id, err);
      stockWarning = 'Status saved, but stock could not be updated. Adjust it in Inventory.';
    }
  }

  if (assigned_staff_id !== undefined) {
    const { error } = await supabase.from('orders').update({ assigned_staff_id }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logOrderEvent(id, 'assigned', assigned_staff_id ? `Assigned to staff ${assigned_staff_id}` : 'Unassigned', user.id);
  }

  if (note) {
    await logOrderEvent(id, 'note_added', note, user.id);
  }

  return NextResponse.json({ ok: true, ...(stockWarning ? { warning: stockWarning } : {}) });
}
