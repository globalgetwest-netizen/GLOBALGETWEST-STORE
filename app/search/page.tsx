// app/search/page.tsx
// Results for the header search box. Uses the same product cards and links
// as /products — the previous version linked to /product/<id>, a route that
// doesn't exist, so every search result opened a 404.
import Link from 'next/link';
import { getProductsByCategory, searchProducts } from '@/lib/catalog';
import { ProductCard } from '@/components/ProductCard';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? '').trim();
  const products = query ? await searchProducts(query) : await getProductsByCategory();

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-10">
      <h1 className="font-display text-3xl mb-1">
        {query ? <>Results for &ldquo;{query}&rdquo;</> : 'All Products'}
      </h1>
      <p className="text-[var(--color-ink-soft)] text-sm mb-8">
        {products.length} product{products.length === 1 ? '' : 's'}
      </p>

      {products.length === 0 ? (
        <div className="py-12">
          <p className="text-[var(--color-ink-soft)] mb-4">
            Nothing matched &ldquo;{query}&rdquo;. Try a shorter word or browse everything.
          </p>
          <Link href="/products" className="focus-ring text-[var(--color-forest)] font-medium hover:underline">
            Browse all products →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
