// lib/format.ts
export function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/** Format an amount in any currency's minor units (pesewas, kobo, cents). */
export function formatMoney(minorUnits: number, currency: string): string {
  return (minorUnits / 100).toLocaleString('en-US', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' });
}
