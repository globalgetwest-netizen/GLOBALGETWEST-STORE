// app/api/admin/products/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabase/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const {
    slug, name, short_description, description, category_id, origin_country,
    ingredients, usage_instructions, warnings, is_active, is_featured,
    variants, images,
  } = body;

  const { error: productError } = await supabase
    .from('products')
    .update({
      slug, name, short_description, description,
      category_id: category_id || null, origin_country, ingredients,
      usage_instructions, warnings, is_active, is_featured,
    })
    .eq('id', id);

  if (productError) return NextResponse.json({ error: productError.message }, { status: 500 });

  // Variants/images: upsert existing (by id), insert new (no id).
  // Simplest correct approach — replace the full set rather than diffing.
  if (variants) {
    const existingIds = variants.filter((v: any) => v.id).map((v: any) => v.id);
    await supabase.from('product_variants').delete().eq('product_id', id).not(
      'id', 'in', `(${existingIds.length ? existingIds.join(',') : '00000000-0000-0000-0000-000000000000'})`,
    );

    for (const [i, v] of variants.entries()) {
      if (v.id) {
        await supabase.from('product_variants').update({
          sku: v.sku, name: v.name, price_usd_cents: v.price_usd_cents,
          compare_at_usd_cents: v.compare_at_usd_cents, is_active: v.is_active, sort_order: i,
        }).eq('id', v.id);
      } else {
        await supabase.from('product_variants').insert({
          product_id: id, sku: v.sku, name: v.name, price_usd_cents: v.price_usd_cents,
          compare_at_usd_cents: v.compare_at_usd_cents, is_active: v.is_active, sort_order: i,
        });
      }
    }
  }

  if (images) {
    const validImages = images.filter((img: any) => img.url?.trim());
    const existingIds = validImages.filter((img: any) => img.id).map((img: any) => img.id);
    await supabase.from('product_images').delete().eq('product_id', id).not(
      'id', 'in', `(${existingIds.length ? existingIds.join(',') : '00000000-0000-0000-0000-000000000000'})`,
    );

    for (const [i, img] of validImages.entries()) {
      if (img.id) {
        await supabase.from('product_images').update({ url: img.url, alt_text: img.alt_text, sort_order: i }).eq('id', img.id);
      } else {
        await supabase.from('product_images').insert({ product_id: id, url: img.url, alt_text: img.alt_text, sort_order: i });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Soft-delete: deactivate rather than hard-delete, since order_items may
  // reference this product's variants historically.
  const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
