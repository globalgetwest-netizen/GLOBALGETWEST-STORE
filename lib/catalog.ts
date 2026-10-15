// lib/catalog.ts
import { supabaseServerClient } from './supabase/server';

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  origin_country: string | null;
  avg_rating: number;
  review_count: number;
  image_url: string | null;
  price_from_usd_cents: number;
  // The variant matching price_from_usd_cents — lets a listing/grid card
  // add to cart directly without navigating to the product page first.
  default_variant_id: string | null;
}

export async function getFeaturedProducts(limit = 8): Promise<ProductCardData[]> {
  const supabase = await supabaseServerClient();

  const { data, error } = await supabase
    .from('products')
    .select(`
      id, slug, name, short_description, origin_country, avg_rating, review_count,
      product_images ( url, sort_order ),
      product_variants ( id, price_usd_cents )
    `)
    .eq('is_active', true)
    .eq('is_featured', true)
    .limit(limit);

  if (error || !data) return [];
  return data.map(mapToCard);
}

export async function getProductsByCategory(categorySlug?: string): Promise<ProductCardData[]> {
  const supabase = await supabaseServerClient();

  let query = supabase
    .from('products')
    .select(`
      id, slug, name, short_description, origin_country, avg_rating, review_count,
      product_images ( url, sort_order ),
      product_variants ( id, price_usd_cents ),
      categories!inner ( slug )
    `)
    .eq('is_active', true);

  if (categorySlug) {
    query = query.eq('categories.slug', categorySlug);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(mapToCard);
}

export async function searchProducts(term: string): Promise<ProductCardData[]> {
  const supabase = await supabaseServerClient();

  const { data, error } = await supabase
    .from('products')
    .select(`
      id, slug, name, short_description, origin_country, avg_rating, review_count,
      product_images ( url, sort_order ),
      product_variants ( id, price_usd_cents )
    `)
    .eq('is_active', true)
    .textSearch('search_tsv', term, { type: 'websearch' });

  if (!error && data && data.length > 0) return data.map(mapToCard);

  // Full-text search only matches whole words ("liver", not "liv"), so fall
  // back to a partial name match before telling the shopper nothing matched.
  const pattern = `%${term.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const { data: partial } = await supabase
    .from('products')
    .select(`
      id, slug, name, short_description, origin_country, avg_rating, review_count,
      product_images ( url, sort_order ),
      product_variants ( id, price_usd_cents )
    `)
    .eq('is_active', true)
    .ilike('name', pattern);

  return (partial ?? []).map(mapToCard);
}

export async function getProductBySlug(slug: string) {
  const supabase = await supabaseServerClient();

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_images ( id, url, alt_text, sort_order ),
      product_variants ( id, sku, name, price_usd_cents, compare_at_usd_cents, is_active, sort_order ),
      categories ( slug, name ),
      reviews ( id, rating, title, body, created_at, is_published )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    // Don't swallow this silently — a masked error here is exactly what
    // made this bug hard to diagnose. Check Vercel's Logs tab for this
    // message (with the real Postgrest error code/detail) whenever a
    // product 404s unexpectedly.
    console.error(`getProductBySlug("${slug}") failed:`, error);
    return null;
  }
  return data;
}

// Shape of the product rows selected by the listing queries above.
interface CatalogRow {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  origin_country: string | null;
  avg_rating: number | null;
  review_count: number | null;
  product_images: { url: string; sort_order: number }[] | null;
  product_variants: { id: string; price_usd_cents: number }[] | null;
}

function mapToCard(input: unknown): ProductCardData {
  const row = input as CatalogRow;
  const images = [...(row.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const variants = row.product_variants ?? [];
  const prices = variants.map((v) => v.price_usd_cents);
  const cheapest = variants.length
    ? variants.reduce((min, v) => (v.price_usd_cents < min.price_usd_cents ? v : min), variants[0])
    : null;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    short_description: row.short_description,
    origin_country: row.origin_country,
    avg_rating: row.avg_rating ?? 0,
    review_count: row.review_count ?? 0,
    image_url: images[0]?.url ?? null,
    price_from_usd_cents: prices.length ? Math.min(...prices) : 0,
    default_variant_id: cheapest?.id ?? null,
  };
}

export { formatUsd } from './format';
