// app/api/cart/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Sign in to add items to your cart' }, { status: 401 });
  }

  const { variantId, quantity } = await req.json() as { variantId: string; quantity: number };

  if (!variantId || !quantity || quantity < 1) {
    return NextResponse.json({ error: 'Invalid variant or quantity' }, { status: 400 });
  }

  // Upsert: if this variant is already in the cart, add to the existing quantity
  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('profile_id', user.id)
    .eq('variant_id', variantId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from('cart_items')
      .insert({ profile_id: user.id, variant_id: variantId, quantity });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { cartItemId, quantity } = await req.json() as { cartItemId: string; quantity: number };

  if (quantity < 1) {
    const { error } = await supabase.from('cart_items').delete().eq('id', cartItemId).eq('profile_id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: true });
  }

  const { error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('id', cartItemId)
    .eq('profile_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { cartItemId } = await req.json() as { cartItemId: string };
  const { error } = await supabase.from('cart_items').delete().eq('id', cartItemId).eq('profile_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
