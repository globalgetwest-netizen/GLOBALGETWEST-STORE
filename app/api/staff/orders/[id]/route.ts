// app/api/staff/orders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabase/server';
import { logOrderEvent } from '@/lib/orders';

// Staff can only move an order through fulfilment states. They cannot set
// 'paid' (that's payment-webhook-only), 'pending_payment', 'cancelled', or
// 'refunded' — those are financial actions reserved for admin.
const ALLOWED_STAFF_STATUSES = ['processing', 'fulfilled', 'shipped', 'delivered'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active || (profile.role !== 'staff' && profile.role !== 'admin')) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const body = await req.json();
  const { status, assigned_staff_id, note } = body as {
    status?: string; assigned_staff_id?: string; note?: string;
  };

  if (status) {
    if (!ALLOWED_STAFF_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Staff cannot set this status' }, { status: 403 });
    }
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logOrderEvent(id, 'status_changed', `Status set to ${status}`, user.id);
    if (status === 'shipped') {
      await logOrderEvent(id, 'shipped', undefined, user.id);
    }
  }

  if (assigned_staff_id) {
    // Staff can only claim orders for themselves, not reassign to others.
    if (assigned_staff_id !== user.id) {
      return NextResponse.json({ error: 'You can only assign orders to yourself' }, { status: 403 });
    }
    const { error } = await supabase.from('orders').update({ assigned_staff_id }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logOrderEvent(id, 'assigned', 'Claimed by staff', user.id);
  }

  if (note) {
    await logOrderEvent(id, 'note_added', note, user.id);
  }

  return NextResponse.json({ ok: true });
}
