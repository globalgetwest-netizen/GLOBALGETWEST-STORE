// app/admin/products/page.tsx
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/guard';
import { formatUsd } from '@/lib/catalog';

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
            {(products ?? []).map((p: any) => {
              const prices = p.product_variants.map((v: any) => v.price_usd_cents);
              return (
                <tr key={p.id} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-2.5 font-medium">{p.name}</td>
                  <td className="px-4 py-2.5">{prices.length ? formatUsd(Math.min(...prices)) : '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-[var(--color-forest)]/10 text-[var(--color-forest)]' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {p.is_featured && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[var(--color-ochre)]/15 text-[var(--color-ochre)]">
                        Featured
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/admin/products/${p.id}/edit`} className="focus-ring text-[var(--color-forest)] hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
            {(!products || products.length === 0) && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-ink-soft)]">No products yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
