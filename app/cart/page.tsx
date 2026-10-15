// app/cart/page.tsx
import Link from 'next/link';
import { supabaseServerClient } from '@/lib/supabase/server';
import { formatUsd } from '@/lib/catalog';
import { CartItemRow } from '@/components/CartItemRow';
import { SecureCheckoutNote } from '@/components/SecureCheckoutNote';
import { asCartLines } from '@/lib/cartTypes';

export default async function CartPage() {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // No session yet just means nothing has been added — show an empty cart
  // instead of asking a visitor to sign in.
  const { data: items } = user ? await supabase
    .from('cart_items')
    .select(`
      id, quantity,
      product_variants ( id, name, price_usd_cents, products ( name, slug, product_images ( url, sort_order ) ) )
    `)
    .eq('profile_id', user.id)
    .order('created_at') : { data: [] };

  const cartItems = asCartLines(items);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product_variants.price_usd_cents * item.quantity,
    0,
  );

  if (cartItems.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-ochre)] font-semibold mb-3">Your cart</p>
        <h1 className="font-display text-4xl mb-3">Nothing here yet</h1>
        <p className="text-[var(--color-ink-soft)] mb-8">
          Explore our botanical extracts and add your favourites. No account needed.
        </p>
        <Link
          href="/products"
          className="focus-ring inline-block bg-[var(--color-charcoal)] text-white font-semibold px-7 py-3 rounded hover:bg-black transition-colors"
        >
          Shop all products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex items-baseline justify-between gap-4 mb-8">
        <h1 className="font-display text-4xl">Your cart</h1>
        <p className="text-sm text-[var(--color-ink-soft)]">
          {itemCount} item{itemCount === 1 ? '' : 's'}
        </p>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-10 items-start">
        <div className="border-t border-[var(--color-border)]">
          {cartItems.map((item) => (
            <CartItemRow key={item.id} item={item} />
          ))}
          <Link href="/products" className="focus-ring inline-block mt-6 text-sm text-[var(--color-forest)] font-medium hover:underline">
            ← Continue shopping
          </Link>
        </div>

        <aside className="lg:sticky lg:top-32 rounded-lg border border-[var(--color-border)] bg-[var(--color-parchment-warm)] p-6">
          <h2 className="font-display text-xl mb-5">Order summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-ink-soft)]">Subtotal</span>
              <span className="font-medium">{formatUsd(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-ink-soft)]">Delivery</span>
              <span className="text-[var(--color-ink-soft)]">Calculated at checkout</span>
            </div>
          </div>
          <div className="flex justify-between items-baseline border-t border-[var(--color-border)] mt-4 pt-4">
            <span className="font-medium">Estimated total</span>
            <span className="font-display text-2xl">{formatUsd(subtotal)}</span>
          </div>
          <Link
            href="/checkout"
            className="focus-ring mt-6 block text-center bg-[var(--color-charcoal)] text-white font-semibold px-6 py-3.5 rounded hover:bg-black transition-colors"
          >
            Checkout
          </Link>
          <p className="mt-3 text-center text-xs text-[var(--color-ink-soft)]">No account needed to check out.</p>
          <SecureCheckoutNote />
        </aside>
      </div>
    </div>
  );
}
