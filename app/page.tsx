// app/page.tsx
import Link from 'next/link';
import { getFeaturedProducts } from '@/lib/catalog';
import { ProductCard } from '@/components/ProductCard';

export default async function HomePage() {
  const featured = await getFeaturedProducts(8);

  return (
    <div>
      {/* Hero */}
      <section className="bg-[var(--color-forest)] text-[var(--color-parchment)]">
        <div className="mx-auto max-w-7xl px-4 py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="uppercase tracking-[0.2em] text-[var(--color-ochre-light)] text-xs font-medium mb-4">
              Rooted in Tradition, Delivered Worldwide
            </p>
            <h1 className="font-display text-4xl md:text-5xl leading-[1.1] mb-5">
              Natural remedies, sourced with proof of origin.
            </h1>
            <p className="text-[var(--color-parchment)]/80 text-base mb-8 max-w-md">
              Every product on GLOBALGETWEST carries its ingredient sourcing,
              origin country, and preparation method — so you know exactly
              what you're taking, and where it came from.
            </p>
            <Link
              href="/products"
              className="focus-ring inline-block bg-[var(--color-ochre)] text-[var(--color-forest-dark)] font-semibold px-6 py-3 rounded-md hover:bg-[var(--color-ochre-light)] transition-colors"
            >
              Shop All Products
            </Link>
          </div>
          <div className="hidden md:block aspect-[4/3] rounded-lg bg-[var(--color-forest-dark)] border border-white/10" />
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-[var(--color-border)] bg-[var(--color-parchment-warm)]">
        <div className="mx-auto max-w-7xl px-4 py-4 flex flex-wrap gap-x-10 gap-y-2 text-sm text-[var(--color-ink-soft)] justify-center">
          <span>🌍 Ships worldwide</span>
          <span>🔒 Secure checkout — cards, mobile money &amp; more</span>
          <span>🌿 Ingredient &amp; origin disclosure on every product</span>
        </div>
      </section>

      {/* Featured products */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-display text-2xl">Featured Products</h2>
          <Link href="/products" className="focus-ring text-sm text-[var(--color-forest)] font-medium hover:underline">
            View all →
          </Link>
        </div>

        {featured.length === 0 ? (
          <p className="text-[var(--color-ink-soft)] text-sm">
            No featured products yet — add some in the admin portal.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
