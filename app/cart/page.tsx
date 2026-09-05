// app/cart/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabaseServerClient } from '@/lib/supabase/server';
import { formatUsd } from '@/lib/catalog';
import { CartItemRow } from '@/components/CartItemRow';

export default async function CartPage() {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/account/sign-in?next=/cart');
  }

  const { data: items } = await supabase
    .from('cart_items')
    .select(`
      id, quantity,
      product_variants ( id, name, price_usd_cents, products ( name, slug, product_images ( url, sort_order ) ) )
    `)
    .eq('profile_id', user!.id);

  const cartItems = items ?? [];
  const subtotal = cartItems.reduce(
    (sum, item: any) => sum + item.product_variants.price_usd_cents * item.quantity,
    0,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl mb-8">Your Cart</h1>

      {cartItems.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[var(--color-ink-soft)] mb-4">Your cart is empty.</p>
          <Link href="/products" className="focus-ring text-[var(--color-forest)] font-medium hover:underline">
            Continue shopping →
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            {cartItems.map((item: any) => (
              <CartItemRow key={item.id} item={item} />
            ))}
          </div>

          <div className="border border-[var(--color-border)] rounded-lg p-5 h-fit bg-white/60">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[var(--color-ink-soft)]">Subtotal</span>
              <span className="font-medium">{formatUsd(subtotal)}</span>
            </div>
            <p className="text-xs text-[var(--color-ink-soft)] mb-4">
              Shipping and any applicable taxes calculated at checkout.
            </p>
            <Link
              href="/checkout"
              className="focus-ring block text-center bg-[var(--color-charcoal)] text-white font-semibold px-6 py-3 rounded hover:bg-black transition-colors"
            >
              Proceed to Checkout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
