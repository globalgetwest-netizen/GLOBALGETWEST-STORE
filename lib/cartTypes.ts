// lib/cartTypes.ts
// Shapes of the cart_items rows the storefront selects with nested
// product_variants → products. The Supabase client here is untyped (no
// generated Database types), so these give the cart code real types
// instead of `any`. Fields are optional where only some queries select them.

export interface CartProductImage {
  url: string;
  sort_order: number;
}

export interface CartVariant {
  id: string;
  name: string;
  price_usd_cents: number;
  sku?: string;
  weight_grams?: number | null;
  free_shipping?: boolean | null;
  products: {
    name: string;
    slug?: string;
    product_images?: CartProductImage[] | null;
  };
}

export interface CartLine {
  id: string;
  quantity: number;
  product_variants: CartVariant;
}

/** Cast an untyped Supabase cart_items result to CartLine rows. */
export function asCartLines(rows: unknown): CartLine[] {
  return (rows ?? []) as CartLine[];
}
