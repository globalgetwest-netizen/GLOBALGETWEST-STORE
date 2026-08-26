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
}

export async function getFeaturedProducts(limit = 8): Promise<ProductCardData[]> {
  const supabase = await supabaseServerClient();

  const { data, error } = await supabase
    .from('products')
    .select(`
      id, slug, name, short_description, origin_country, avg_rating, review_count,
      product_images ( url, sort_order ),
      product_variants ( price_usd_cents )
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
      product_variants ( price_usd_cents ),
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
      product_variants ( price_usd_cents )
    `)
    .eq('is_active', true)
    .textSearch('search_tsv', term, { type: 'websearch' });

  if (error || !data) return [];
  return data.map(mapToCard);
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

  if (error || !data) return null;
  return data;
}

function mapToCard(row: any): ProductCardData {
  const images = (row.product_images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
  const prices = (row.product_variants ?? []).map((v: any) => v.price_usd_cents);

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
  };
}

export { formatUsd } from './format';
