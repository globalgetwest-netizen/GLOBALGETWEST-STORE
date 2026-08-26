// app/products/page.tsx
import { getProductsByCategory } from '@/lib/catalog';
import { ProductCard } from '@/components/ProductCard';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const products = await getProductsByCategory(category);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-3xl mb-1">
        {category ? category.replace(/-/g, ' ') : 'All Products'}
      </h1>
      <p className="text-[var(--color-ink-soft)] text-sm mb-8">
        {products.length} product{products.length === 1 ? '' : 's'}
      </p>

      {products.length === 0 ? (
        <p className="text-[var(--color-ink-soft)]">No products found in this category yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
