// app/checkout/page.tsx
import { redirect } from 'next/navigation';
import { supabaseServerClient } from '@/lib/supabase/server';
import { CheckoutFlow } from '@/components/CheckoutFlow';
import { configuredGateways } from '@/lib/payments';
import { asCartLines } from '@/lib/cartTypes';

export default async function CheckoutPage() {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/cart');

  const { data } = await supabase
    .from('cart_items')
    .select(`
      id, quantity,
      product_variants ( name, price_usd_cents, weight_grams, products ( name, product_images ( url, sort_order ) ) )
    `)
    .eq('profile_id', user.id)
    .order('created_at');
  const items = asCartLines(data);

  if (items.length === 0) redirect('/cart');

  const subtotalUsdCents = items.reduce(
    (sum, item) => sum + item.product_variants.price_usd_cents * item.quantity,
    0,
  );
  const totalWeightGrams = items.reduce(
    (sum, item) => sum + (item.product_variants.weight_grams ?? 100) * item.quantity,
    0,
  );

  const lineItems = items.map((item) => {
    const variant = item.product_variants;
    const images = [...(variant.products?.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    return {
      id: item.id,
      name: variant.products?.name ?? variant.name,
      variant: variant.name,
      quantity: item.quantity,
      imageUrl: images[0]?.url ?? null,
      lineTotalUsdCents: variant.price_usd_cents * item.quantity,
    };
  });

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
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-8">
        <h1 className="font-display text-4xl">Checkout</h1>
        {user.is_anonymous && (
          <p className="text-sm text-[var(--color-ink-soft)]">
            No account needed ·{' '}
            <a href="/account/sign-in?next=/checkout" className="focus-ring text-[var(--color-forest)] font-medium hover:underline">
              Sign in
            </a>
          </p>
        )}
      </div>
      <CheckoutFlow cart={{ subtotalUsdCents, totalWeightGrams, items: lineItems }} fxRates={fxRates} isGuest={!!user.is_anonymous} enabledGateways={configuredGateways()} />
    </div>
  );
}
