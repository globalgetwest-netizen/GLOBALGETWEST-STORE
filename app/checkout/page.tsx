// app/checkout/page.tsx
import { redirect } from 'next/navigation';
import { supabaseServerClient } from '@/lib/supabase/server';
import { CheckoutFlow } from '@/components/CheckoutFlow';

export default async function CheckoutPage() {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/cart');

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

  // Latest USD → local rates, so the customer sees the exact amount
  // they'll be charged — /api/checkout converts with the same rows.
  const fxRates: Record<string, number> = {};
  for (const quote of ['GHS', 'NGN']) {
    const { data: fx } = await supabase
      .from('fx_rates')
      .select('rate')
      .eq('base_currency', 'USD')
      .eq('quote_currency', quote)
      .order('effective_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fx) fxRates[quote] = Number(fx.rate);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl mb-2">Checkout</h1>
      {user.is_anonymous ? (
        <p className="text-sm text-[var(--color-ink-soft)] mb-8">
          No account needed.{' '}
          <a href="/account/sign-in?next=/checkout" className="focus-ring text-[var(--color-forest)] hover:underline">
            Have one? Sign in
          </a>
        </p>
      ) : <div className="mb-6" />}
      <CheckoutFlow cart={{ subtotalUsdCents, totalWeightGrams }} fxRates={fxRates} isGuest={!!user.is_anonymous} />
    </div>
  );
}
