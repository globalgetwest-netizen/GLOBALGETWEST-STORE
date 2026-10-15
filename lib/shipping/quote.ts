// lib/shipping/quote.ts
// Single source of truth for shipping prices. Used by /api/shipping-rates
// (to show the customer their options) AND by /api/checkout (to re-price the
// option they picked) — checkout must never trust a shipping amount sent
// from the browser, since anyone can edit that request and pay $0 shipping.
import type { SupabaseClient } from '@supabase/supabase-js';
import { easypostProvider } from './easypost';
import type { ShippingAddressInput, ShippingRateOption } from './types';
import { asCartLines } from '../cartTypes';

const FREE_SHIPPING_OPTION: ShippingRateOption = {
  id: 'free-shipping',
  carrier: 'Included',
  service: 'Standard',
  amountUsdCents: 0,
  estimatedDays: 7,
};

const WAREHOUSE_ORIGIN: ShippingAddressInput = {
  fullName: 'GLOBALGETWEST Fulfilment',
  phone: process.env.WAREHOUSE_PHONE ?? '',
  line1: process.env.WAREHOUSE_ADDRESS_LINE1 ?? '',
  city: process.env.WAREHOUSE_CITY ?? '',
  region: process.env.WAREHOUSE_REGION,
  postalCode: process.env.WAREHOUSE_POSTAL_CODE,
  countryCode: process.env.WAREHOUSE_COUNTRY_CODE ?? 'US',
};

// Temporary fallback so checkout can complete before EasyPost is configured
// (EASYPOST_API_KEY not set yet). This is a flat estimate, not a real
// carrier quote — replace by setting EASYPOST_API_KEY once that account
// exists; this fallback only activates when the real call fails or the key
// is missing, so switching to live rates requires no code change.
//
// Timeframes below are set deliberately fast-sounding ("Express") since a
// long quoted delivery window measurably hurts conversion — but this is
// still an ESTIMATE, not a guarantee backed by a real carrier booking.
// Actual fulfillment time depends on which real carrier/service staff
// choose when they manually ship the order (see /staff/orders). If actual
// fulfillment is consistently slower than this estimate once you're
// shipping real orders, come back and adjust these numbers down to match
// reality — overpromising here creates real customer complaints later,
// which is worse for conversion long-term than an honest slightly-longer
// number today.
function flatRateFallback(destination: ShippingAddressInput): ShippingRateOption[] {
  const domestic = destination.countryCode === (process.env.WAREHOUSE_COUNTRY_CODE ?? 'US');
  return [
    {
      id: 'flat-rate-fallback',
      carrier: 'Express Shipping',
      service: domestic ? 'Domestic' : 'International',
      amountUsdCents: domestic ? 1500 : 4500,
      estimatedDays: domestic ? 4 : 7,
    },
  ];
}

export interface ShippingQuote {
  rates: ShippingRateOption[];
  freeShipping?: true;
  fallback?: true;
}

/**
 * Quote shipping for the signed-in user's current cart. Weight and the
 * free-shipping flag are read from the cart server-side, never from the
 * request body.
 */
export async function quoteShippingForCart(
  supabase: SupabaseClient,
  userId: string,
  destination: ShippingAddressInput,
): Promise<ShippingQuote> {
  const { data } = await supabase
    .from('cart_items')
    .select('quantity, product_variants!inner(weight_grams, free_shipping)')
    .eq('profile_id', userId);
  const items = asCartLines(data);

  // If ANY item in the customer's current cart has a variant marked
  // free_shipping (e.g. a "2-Month Full Package"), the whole order ships
  // free — a single flat per-order shipping charge doesn't split cleanly
  // per-item, so one qualifying item waives it for the order.
  if (items.some((item) => item.product_variants?.free_shipping === true)) {
    return { rates: [FREE_SHIPPING_OPTION], freeShipping: true };
  }

  if (!process.env.EASYPOST_API_KEY) {
    // No account set up yet — use the flat-rate fallback rather than
    // blocking every checkout entirely.
    return { rates: flatRateFallback(destination), fallback: true };
  }

  const totalWeightGrams = items.reduce(
    (sum, item) => sum + (item.product_variants?.weight_grams ?? 100) * item.quantity,
    0,
  );

  try {
    const rates = await easypostProvider.getRates(
      WAREHOUSE_ORIGIN,
      destination,
      { weightGrams: totalWeightGrams || 500 },
    );
    if (rates.length === 0) {
      return { rates: flatRateFallback(destination), fallback: true };
    }
    return { rates };
  } catch (err) {
    console.error('Shipping rate error, using flat-rate fallback:', err);
    return { rates: flatRateFallback(destination), fallback: true };
  }
}

/**
 * Find the option the customer picked in a freshly computed quote. EasyPost
 * issues new rate ids on every request, so fall back to carrier + service.
 */
export function findSelectedRate(
  rates: ShippingRateOption[],
  selected: { id?: string; carrier?: string; service?: string },
): ShippingRateOption | null {
  return (
    rates.find((r) => r.id === selected.id) ??
    rates.find((r) => r.carrier === selected.carrier && r.service === selected.service) ??
    null
  );
}
