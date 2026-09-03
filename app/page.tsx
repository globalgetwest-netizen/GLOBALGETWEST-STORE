// app/page.tsx
import Link from 'next/link';
import { getFeaturedProducts } from '@/lib/catalog';
import { ProductCard } from '@/components/ProductCard';
import { supabaseServerClient } from '@/lib/supabase/server';
import { NewsletterSignup } from '@/components/NewsletterSignup';

export default async function HomePage() {
  const featured = await getFeaturedProducts(8);
  const supabase = await supabaseServerClient();
  const { data: categories } = await supabase
    .from('categories')
    .select('name, slug')
    .eq('is_active', true)
    .order('sort_order')
    .limit(6);

  // Real product images for the hero composition — per explicit direction,
  // using actual stored product photos as-is, not a placeholder mark.
  const { data: heroRaw } = await supabase
    .from('products')
    .select(`
      slug, name,
      product_images ( url, sort_order )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(3);

  const heroProducts = (heroRaw ?? [])
    .map((p: any) => {
      const images = (p.product_images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
      return { slug: p.slug, name: p.name, image: images[0]?.url ?? null };
    })
    .filter((p) => p.image !== null);

  return (
    <div>
      {/* Hero */}
      <section className="bg-[var(--color-forest)] text-[var(--color-parchment)]">
        <div className="mx-auto max-w-[1600px] px-4 py-14 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="uppercase tracking-[0.25em] text-[var(--color-ochre-light)] text-xs font-medium mb-5">
              Sourced with Precision
            </p>
            <h1 className="font-display text-4xl md:text-6xl leading-[1.08] mb-6">
              Nature, refined<br />with precision.
            </h1>
            <p className="text-[var(--color-parchment)]/75 text-base md:text-lg mb-3 max-w-md">
              Premium botanical formulations, thoughtfully sourced and
              prepared for modern wellness.
            </p>
            <p className="text-[var(--color-parchment)]/60 text-sm mb-9 max-w-md">
              Discover carefully selected products with transparent sourcing,
              origin and preparation information — delivered worldwide.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/products"
                className="focus-ring inline-block bg-[var(--color-ochre)] text-[var(--color-forest-dark)] font-semibold px-7 py-3 rounded-md hover:bg-[var(--color-ochre-light)] transition-colors"
              >
                Shop All Products →
              </Link>
              <Link
                href="/products"
                className="focus-ring inline-block border border-white/30 text-[var(--color-parchment)] font-semibold px-7 py-3 rounded-md hover:border-white/60 hover:bg-white/5 transition-colors"
              >
                Our Sourcing &amp; Quality →
              </Link>
            </div>
          </div>

          {/* Real product photography, arranged as a campaign-style
              composition (one larger focal item + smaller supporting
              items) rather than a flat identical grid — using the actual
              stored images as-is, not recreated or regenerated. */}
          {heroProducts.length > 0 ? (
            <div className="hidden md:grid grid-cols-2 gap-4">
              <Link
                href={`/products/${heroProducts[0].slug}`}
                className="focus-ring group row-span-2 rounded-xl overflow-hidden bg-white shadow-xl"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroProducts[0].image!}
                  alt={heroProducts[0].name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </Link>
              {heroProducts.slice(1, 3).map((p) => (
                <Link
                  key={p.slug}
                  href={`/products/${p.slug}`}
                  className="focus-ring group rounded-xl overflow-hidden bg-white shadow-lg aspect-square"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image!}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </Link>
              ))}
            </div>
          ) : (
            <div className="hidden md:flex relative aspect-[4/3] rounded-lg bg-[var(--color-forest-dark)] border border-white/10 items-center justify-center overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  background: 'radial-gradient(circle at center, rgba(192,138,52,0.22) 0%, transparent 65%)',
                }}
              />
              <img src="/logo.png" alt="" className="relative w-1/2 h-1/2 object-contain drop-shadow-2xl" />
            </div>
          )}
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-b border-[var(--color-border)] bg-[var(--color-parchment-warm)]">
        <div className="mx-auto max-w-[1600px] px-4 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-[var(--color-ink-soft)]">
          <TrustItem
            icon={<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 0c2.5 2.5 4 5.7 4 10s-1.5 7.5-4 10M12 2C9.5 4.5 8 7.7 8 12s1.5 7.5 4 10M2 12h20" />}
            title="Ships Worldwide"
            label="Fast, reliable international delivery."
          />
          <TrustItem
            icon={<><rect x="5" y="11" width="14" height="9" rx="1.5" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>}
            title="Secure Checkout"
            label="Pay safely with available payment methods."
          />
          <TrustItem
            icon={<path d="M12 2C8 6 6 9 6 13a6 6 0 0 0 12 0c0-4-2-7-6-11Zm0 8v10" />}
            title="Full Disclosure"
            label="Transparent ingredient, origin and preparation info."
          />
        </div>
      </section>

      {/* Shop by category — pulled live from the same categories table the
          nav uses, so this section can never show a different list than
          the nav bar above it (previously hardcoded, causing exactly that
          mismatch). Rename/delete a category in /admin/categories and both
          this section and the nav update together. */}
      {categories && categories.length > 0 && (
        <section className="mx-auto max-w-[1600px] px-4 py-8">
          <h2 className="font-display text-2xl mb-6">Shop by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {categories.map((c) => (
              <CategoryTile
                key={c.slug}
                href={`/products?category=${c.slug}`}
                label={c.name}
              />
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      <section className="mx-auto max-w-[1600px] px-4 py-14">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="font-display text-3xl">Featured Products</h2>
          <Link href="/products" className="focus-ring text-sm text-[var(--color-forest)] font-medium hover:underline">
            View All Products →
          </Link>
        </div>

        {featured.length === 0 ? (
          <p className="text-[var(--color-ink-soft)] text-sm">
            No featured products yet — add some in the admin portal.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Newsletter — a real, working signup (not decorative), a genuine
          premium-storefront staple that was entirely missing. */}
      <section className="bg-[var(--color-forest-dark)] text-[var(--color-parchment)]">
        <div className="mx-auto max-w-[1600px] px-4 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="font-display text-2xl mb-1.5">Stay in the loop</h2>
            <p className="text-[var(--color-parchment)]/70 text-sm">
              New products, restocks, and origin stories — no spam, unsubscribe anytime.
            </p>
          </div>
          <NewsletterSignup />
        </div>
      </section>
    </div>
  );
}

function CategoryTile({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="focus-ring group flex flex-col items-center gap-3 rounded-lg border border-[var(--color-border)] bg-white p-5 text-center transition-all hover:shadow-lg hover:-translate-y-0.5 hover:border-[var(--color-ochre)]"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-forest)]/8 text-[var(--color-forest)] transition-colors group-hover:bg-[var(--color-forest)] group-hover:text-[var(--color-parchment)]">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {iconForCategory(label)}
        </svg>
      </div>
      <div>
        <span className="font-medium text-sm text-[var(--color-ink)] block">{label}</span>
        <span className="text-xs text-[var(--color-ink-soft)]">Shop the range</span>
      </div>
      <span className="text-[var(--color-ochre)] text-sm opacity-0 group-hover:opacity-100 transition-opacity">→</span>
    </Link>
  );
}

// A small rotating set of distinct icons, picked deterministically from the
// category name (same name always gets the same icon, but different
// categories visually differ instead of repeating one identical glyph —
// the flat repetition was a real weakness on a page with many categories.
function iconForCategory(label: string): React.ReactNode {
  const icons: React.ReactNode[] = [
    <path key="leaf" d="M12 2C8 6 6 9 6 13a6 6 0 0 0 12 0c0-4-2-7-6-11Z M12 10v10" />,
    <path key="shield" d="M12 2l7 4v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-4z" />,
    <>
      <circle key="c1" cx="12" cy="12" r="9" />
      <path key="c2" d="M8 12h8M12 8v8" />
    </>,
    <>
      <path key="t1" d="M4 8h13a3 3 0 0 1 0 6h-1" />
      <path key="t2" d="M4 8v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V8" />
      <path key="t3" d="M6 3v2M9 3v2M12 3v2" />
    </>,
    <>
      <circle key="d1" cx="12" cy="12" r="3" />
      <path key="d2" d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </>,
    <path key="heart" d="M12 21s-7-4.4-9.5-8.6C.8 9 2.3 5.5 5.6 5c2-.3 3.7.7 4.4 2.2C10.7 5.7 12.4 4.7 14.4 5c3.3.5 4.8 4 3.1 7.4C15 17.6 12 21 12 21z" />,
  ];
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) % icons.length;
  return icons[hash];
}

function TrustItem({ icon, title, label }: { icon: React.ReactNode; title: string; label: string }) {
  return (
    <div className="flex items-start gap-3">
      <svg
        viewBox="0 0 24 24" width="20" height="20" fill="none"
        stroke="var(--color-forest)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
        className="shrink-0 mt-0.5"
      >
        {icon}
      </svg>
      <div>
        <p className="font-medium text-[var(--color-ink)]">{title}</p>
        <p className="text-[var(--color-ink-soft)] text-xs mt-0.5">{label}</p>
      </div>
    </div>
  );
}
