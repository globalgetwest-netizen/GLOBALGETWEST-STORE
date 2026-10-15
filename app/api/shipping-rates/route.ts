// app/api/shipping-rates/route.ts
// Called from the checkout page once the customer has entered their address,
// so they can pick a carrier/service before paying. Pricing lives in
// lib/shipping/quote.ts so /api/checkout can re-price the same way.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabase/server';
import { quoteShippingForCart } from '@/lib/shipping/quote';
import type { ShippingAddressInput } from '@/lib/shipping/types';

export async function POST(req: NextRequest) {
  const { destination } = await req.json() as { destination: ShippingAddressInput };

  if (!destination?.countryCode) {
    return NextResponse.json({ error: 'Destination address required' }, { status: 400 });
  }

  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json(await quoteShippingForCart(supabase, user.id, destination));
}
