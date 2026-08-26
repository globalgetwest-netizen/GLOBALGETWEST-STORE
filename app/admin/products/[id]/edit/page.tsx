// app/admin/products/[id]/edit/page.tsx
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/guard';
import { ProductForm } from '@/components/admin/ProductForm';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const [{ data: categories }, { data: product }] = await Promise.all([
    supabase.from('categories').select('id, name').order('sort_order'),
    supabase
      .from('products')
      .select(`
        id, slug, name, short_description, description, category_id, origin_country,
        ingredients, usage_instructions, warnings, is_active, is_featured,
        product_variants ( id, sku, name, price_usd_cents, compare_at_usd_cents, is_active ),
        product_images ( id, url, alt_text )
      `)
      .eq('id', id)
      .single(),
  ]);

  if (!product) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Edit Product</h1>
      <ProductForm
        categories={categories ?? []}
        initial={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          short_description: product.short_description ?? '',
          description: product.description ?? '',
          category_id: product.category_id ?? '',
          origin_country: product.origin_country ?? '',
          ingredients: product.ingredients ?? '',
          usage_instructions: product.usage_instructions ?? '',
          warnings: product.warnings ?? '',
          is_active: product.is_active,
          is_featured: product.is_featured,
          variants: (product.product_variants ?? []).map((v: any) => ({
            id: v.id, sku: v.sku, name: v.name,
            price_usd_cents: v.price_usd_cents, compare_at_usd_cents: v.compare_at_usd_cents,
            is_active: v.is_active,
          })),
          images: (product.product_images ?? []).map((img: any) => ({
            id: img.id, url: img.url, alt_text: img.alt_text ?? '',
          })),
        }}
      />
    </div>
  );
}
