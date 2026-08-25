// app/api/staff/inventory/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { variantId, quantityChange, reason, note } = await req.json() as {
    variantId: string; quantityChange: number; reason: string; note?: string;
  };

  if (!variantId || !quantityChange || !reason) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // RLS's "staff manage inventory" policy is the real gate here — this insert
  // fails at the database level for anyone who isn't staff/admin.
  const { error } = await supabase.from('inventory_movements').insert({
    variant_id: variantId,
    quantity_change: quantityChange,
    reason,
    note: note || null,
    created_by: user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
