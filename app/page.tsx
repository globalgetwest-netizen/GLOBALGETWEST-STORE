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
              Sourced with Precision, Delivered Worldwide
            </p>
            <h1 className="font-display text-4xl md:text-5xl leading-[1.1] mb-5">
              Natural extracts of selected therapeutic plant compounds.
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
          <div className="hidden md:flex relative aspect-[4/3] rounded-lg bg-[var(--color-forest-dark)] border border-white/10 items-center justify-center overflow-hidden">
            {/* Subtle radial glow behind the emblem */}
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle at center, rgba(192,138,52,0.20) 0%, transparent 65%)',
              }}
            />
            {/* Faint decorative line-grid, evokes the globe/compass motif in the logo without competing with it */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.07]" viewBox="0 0 400 300" fill="none">
              <circle cx="200" cy="150" r="120" stroke="var(--color-parchment)" strokeWidth="1" />
              <circle cx="200" cy="150" r="90" stroke="var(--color-parchment)" strokeWidth="1" />
              <line x1="80" y1="150" x2="320" y2="150" stroke="var(--color-parchment)" strokeWidth="1" />
              <line x1="200" y1="30" x2="200" y2="270" stroke="var(--color-parchment)" strokeWidth="1" />
              <ellipse cx="200" cy="150" rx="120" ry="45" stroke="var(--color-parchment)" strokeWidth="1" />
              <ellipse cx="200" cy="150" rx="120" ry="85" stroke="var(--color-parchment)" strokeWidth="1" />
            </svg>
            <img
              src="/logo.png"
              alt=""
              className="relative w-2/3 h-2/3 object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-[var(--color-border)] bg-[var(--color-parchment-warm)]">
        <div className="mx-auto max-w-7xl px-4 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-[var(--color-ink-soft)]">
          <TrustItem
            icon={<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 0c2.5 2.5 4 5.7 4 10s-1.5 7.5-4 10M12 2C9.5 4.5 8 7.7 8 12s1.5 7.5 4 10M2 12h20" />}
            label="Ships worldwide"
          />
          <TrustItem
            icon={<><rect x="5" y="11" width="14" height="9" rx="1.5" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>}
            label="Secure checkout — cards, mobile money & more"
          />
          <TrustItem
            icon={<path d="M12 2C8 6 6 9 6 13a6 6 0 0 0 12 0c0-4-2-7-6-11Zm0 8v10" />}
            label="Ingredient & origin disclosure on every product"
          />
        </div>
      </section>

      {/* Shop by category */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="font-display text-2xl mb-6">Shop by Category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <CategoryTile
            href="/products?category=immune-support"
            label="Immune Support"
            icon={<path d="M12 2l7 4v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-4z" />}
          />
          <CategoryTile
            href="/products?category=liver-detox"
            label="Liver & Detox"
            icon={<path d="M12 2C8 6 6 9 6 13a6 6 0 0 0 12 0c0-4-2-7-6-11Z" />}
          />
          <CategoryTile
            href="/products?category=digestive-health"
            label="Digestive Health"
            icon={<><circle cx="12" cy="12" r="9" /><path d="M8 12h8M12 8v8" /></>}
          />
          <CategoryTile
            href="/products?category=teas-tinctures"
            label="Teas & Tinctures"
            icon={<><path d="M4 8h13a3 3 0 0 1 0 6h-1" /><path d="M4 8v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V8" /><path d="M6 3v2M9 3v2M12 3v2" /></>}
          />
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

function CategoryTile({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="focus-ring group flex flex-col items-center gap-3 rounded-lg border border-[var(--color-border)] bg-white p-6 text-center transition-all hover:shadow-lg hover:-translate-y-0.5 hover:border-[var(--color-ochre)]"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-forest)]/8 text-[var(--color-forest)] transition-colors group-hover:bg-[var(--color-forest)] group-hover:text-[var(--color-parchment)]">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </div>
      <span className="font-medium text-sm text-[var(--color-ink)]">{label}</span>
    </Link>
  );
}

function TrustItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        viewBox="0 0 24 24" width="18" height="18" fill="none"
        stroke="var(--color-forest)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
        className="shrink-0"
      >
        {icon}
      </svg>
      <span>{label}</span>
    </div>
  );
}
