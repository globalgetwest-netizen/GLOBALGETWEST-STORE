// app/checkout/page.tsx
import { redirect } from 'next/navigation';
import { supabaseServerClient } from '@/lib/supabase/server';
import { CheckoutFlow } from '@/components/CheckoutFlow';

export default async function CheckoutPage() {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/account/sign-in?next=/checkout');

  const { data: items } = await supabase
    .from('cart_items')
    .select('quantity, product_variants ( price_usd_cents, weight_grams )')
    .eq('profile_id', user.id);

  if (!items || items.length === 0) redirect('/cart');

  const subtotalUsdCents = items.reduce(
    (sum, item: any) => sum + item.product_variants.price_usd_cents * item.quantity,
    0,
  );
  const totalWeightGrams = items.reduce(
    (sum, item: any) => sum + (item.product_variants.weight_grams ?? 100) * item.quantity,
    0,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl mb-8">Checkout</h1>
      <CheckoutFlow cart={{ subtotalUsdCents, totalWeightGrams }} />
    </div>
  );
}
