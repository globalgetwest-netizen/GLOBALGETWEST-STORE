// app/api/admin/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabase/server';

// Shapes the admin product form sends (see components/admin/ProductForm.tsx).
interface VariantInput {
  id?: string; sku: string; name: string; price_usd_cents: number;
  compare_at_usd_cents: number | null; is_active: boolean; free_shipping?: boolean;
}
interface ImageInput { id?: string; url: string; alt_text?: string }

export async function POST(req: NextRequest) {
  // Uses the request-scoped client (not service role) so RLS's is_admin()
  // check is the real gate here, not just the requireAdmin() page guard.
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const {
    slug, name, short_description, description, category_id, origin_country,
    ingredients, usage_instructions, warnings, is_active, is_featured,
    variants, images,
  } = body as Record<string, unknown> & { variants?: VariantInput[]; images?: ImageInput[] };

  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      slug, name, short_description, description,
      category_id: category_id || null, origin_country, ingredients,
      usage_instructions, warnings, is_active, is_featured,
    })
    .select('id')
    .single();

  if (productError) return NextResponse.json({ error: productError.message }, { status: 500 });

  if (variants?.length) {
    const { error: variantError } = await supabase.from('product_variants').insert(
      variants.map((v, i) => ({
        product_id: product.id,
        sku: v.sku,
        name: v.name,
        price_usd_cents: v.price_usd_cents,
        compare_at_usd_cents: v.compare_at_usd_cents,
        is_active: v.is_active,
        free_shipping: v.free_shipping ?? false,
        sort_order: i,
      })),
    );
    if (variantError) return NextResponse.json({ error: variantError.message }, { status: 500 });
  }

  if (images?.length) {
    const validImages = images.filter((img) => img.url?.trim());
    if (validImages.length) {
      const { error: imageError } = await supabase.from('product_images').insert(
        validImages.map((img, i) => ({
          product_id: product.id,
          url: img.url,
          alt_text: img.alt_text,
          sort_order: i,
        })),
      );
      if (imageError) return NextResponse.json({ error: imageError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ id: product.id });
}
