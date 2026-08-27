// app/admin/products/page.tsx
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/guard';
import { ProductRow } from '@/components/admin/ProductRow';

export default async function AdminProductsPage() {
  const { supabase } = await requireAdmin();

  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, is_active, is_featured, product_variants ( price_usd_cents )')
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Products</h1>
        <Link
          href="/admin/products/new"
          className="focus-ring bg-[var(--color-forest)] text-[var(--color-parchment)] font-semibold px-4 py-2 rounded-md hover:bg-[var(--color-forest-dark)]"
        >
          + New Product
        </Link>
      </div>

      <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-white/60">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-parchment-warm)] text-left">
            <tr>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Price from</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((p: any) => (
              <ProductRow key={p.id} product={p} />
            ))}
            {(!products || products.length === 0) && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-ink-soft)]">No products yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
