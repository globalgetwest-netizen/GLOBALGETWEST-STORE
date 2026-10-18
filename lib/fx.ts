// lib/fx.ts
// Exchange-rate helpers. Prices are stored in USD; these turn them into a
// local-currency GUIDE for visitors in Africa ("≈ KSh 3,240"). What
// checkout actually charges is decided separately by currencyForCountry().
import { headers } from 'next/headers';
import { supabaseServerClient } from './supabase/server';
import { isAfricanCountry, localCurrencyForCountry } from './countries';

export type LocalPricing = { currency: string; rate: number };

/** Newest USD → currency rate for each code (from the latest_fx_rates view). */
export async function latestUsdRates(codes: readonly string[]): Promise<Record<string, number>> {
  if (codes.length === 0) return {};
  const supabase = await supabaseServerClient();
  const { data } = await supabase
    .from('latest_fx_rates')
    .select('quote_currency, rate')
    .eq('base_currency', 'USD')
    .in('quote_currency', [...codes]);
  return Object.fromEntries((data ?? []).map((r) => [r.quote_currency, Number(r.rate)]));
}

/**
 * Local currency for the current visitor, worked out from the country
 * Vercel detects for their connection. Only for African countries with a
 * known rate; everyone else sees USD alone.
 */
export async function visitorLocalPricing(): Promise<LocalPricing | null> {
  const country = (await headers()).get('x-vercel-ip-country')?.toUpperCase() ?? '';
  if (!isAfricanCountry(country)) return null;
  const currency = localCurrencyForCountry(country);
  if (currency === 'USD') return null;
  const rate = (await latestUsdRates([currency]))[currency];
  return rate ? { currency, rate } : null;
}
