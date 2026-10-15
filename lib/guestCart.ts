// lib/guestCart.ts
// When a guest who has been shopping signs in (or signs up), Supabase
// replaces their guest session — and the guest's cart would vanish with it.
// Read the guest cart before switching sessions, then add it back to the
// signed-in account afterwards.
import type { SupabaseClient } from '@supabase/supabase-js';

export interface GuestCartLine { variant_id: string; quantity: number }

export async function readGuestCart(supabase: SupabaseClient): Promise<GuestCartLine[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.is_anonymous) return [];
  const { data } = await supabase
    .from('cart_items')
    .select('variant_id, quantity')
    .eq('profile_id', user.id);
  return data ?? [];
}

export async function restoreGuestCart(lines: GuestCartLine[]) {
  for (const line of lines) {
    await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId: line.variant_id, quantity: line.quantity }),
    }).catch(() => {});
  }
}
