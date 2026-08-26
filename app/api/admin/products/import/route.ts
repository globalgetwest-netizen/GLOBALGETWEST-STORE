// app/api/admin/products/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabase/server';

interface ImportRow {
  name: string; slug: string; category_slug: string; short_description: string;
  description: string; origin_country: string; ingredients: string;
  usage_instructions: string; warnings: string; sku: string;
  variant_name: string; price_usd: string; is_featured: string;
}

export async function POST(req: NextRequest) {
  const supabase = await supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { rows } = await req.json() as { rows: ImportRow[] };

  // Look up category ids once, since RLS-scoped selects are cheap but we
  // don't want one query per row.
  const { data: categories } = await supabase.from('categories').select('id, slug');
  const categoryIdBySlug = new Map((categories ?? []).map((c) => [c.slug, c.id]));

  const results: { row: number; name: string; status: 'ok' | 'error'; message?: string }[] = [];

  // Sequential, not Promise.all — this is an admin bulk-import action, not a
  // hot path, and sequential inserts give a clean per-row result the client
  // can actually trust (no partial-batch race conditions to reason about).
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const priceUsdCents = Math.round(Number(row.price_usd) * 100);
      if (!row.name || !row.slug || !row.sku || !row.variant_name || isNaN(priceUsdCents)) {
        throw new Error('Missing required field or invalid price');
      }

      const categoryId = row.category_slug ? categoryIdBySlug.get(row.category_slug) : null;
      if (row.category_slug && !categoryId) {
        throw new Error(`Unknown category_slug "${row.category_slug}"`);
      }

      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          slug: row.slug,
          name: row.name,
          short_description: row.short_description || null,
          description: row.description || null,
          category_id: categoryId ?? null,
          origin_country: row.origin_country || null,
          ingredients: row.ingredients || null,
          usage_instructions: row.usage_instructions || null,
          warnings: row.warnings || null,
          is_active: true,
          is_featured: row.is_featured?.toLowerCase() === 'true',
        })
        .select('id')
        .single();

      if (productError) throw new Error(productError.message);

      const { error: variantError } = await supabase.from('product_variants').insert({
        product_id: product.id,
        sku: row.sku,
        name: row.variant_name,
        price_usd_cents: priceUsdCents,
        is_active: true,
        sort_order: 0,
      });

      if (variantError) throw new Error(variantError.message);

      results.push({ row: rowNum, name: row.name, status: 'ok' });
    } catch (err) {
      results.push({
        row: rowNum,
        name: row.name || '(unknown)',
        status: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({ results });
}
