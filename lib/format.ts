// lib/format.ts
export function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/** Format an amount in any currency's minor units (pesewas, kobo, cents). */
export function formatMoney(minorUnits: number, currency: string): string {
  return (minorUnits / 100).toLocaleString('en-US', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' });
}

/** Symbols as written locally across Africa. Built-in browser symbols are
 *  ambiguous for some (Liberian and Namibian dollars both come out as "$",
 *  which reads as US dollars), so we keep our own. */
export const AFRICAN_CURRENCY_SYMBOLS: Record<string, string> = {
  AOA: 'Kz', BIF: 'FBu', BWP: 'P', CDF: 'FC', CVE: 'Esc', DJF: 'Fdj', DZD: 'DA', EGP: 'E£',
  ERN: 'Nfk', ETB: 'Br', GHS: 'GH₵', GMD: 'D', GNF: 'FG', KES: 'KSh', KMF: 'CF', LRD: 'L$',
  LSL: 'L', LYD: 'LD', MAD: 'DH', MGA: 'Ar', MRU: 'UM', MUR: 'Rs', MWK: 'MK', MZN: 'MT',
  NAD: 'N$', NGN: '₦', RWF: 'FRw', SCR: 'SR', SDG: 'SDG', SLE: 'Le', SOS: 'Sh.So.', SSP: 'SSP',
  STN: 'Db', SZL: 'E', TND: 'DT', TZS: 'TSh', UGX: 'USh', XAF: 'FCFA', XOF: 'CFA', ZAR: 'R',
  ZMW: 'ZK', ZWG: 'ZiG',
};

/** "≈ KSh 3,240" style guide amount: a USD price at a given rate, rounded
 *  to whole units of the local currency. */
export function formatApproxLocal(usdCents: number, { currency, rate }: { currency: string; rate: number }): string {
  const amount = Math.round((usdCents / 100) * rate).toLocaleString('en-US');
  const symbol = AFRICAN_CURRENCY_SYMBOLS[currency] ?? currency;
  // Letter symbols read best with a space (KSh 3,240); sign symbols without (₦3,240).
  return /[A-Za-z.]$/.test(symbol) ? `${symbol} ${amount}` : `${symbol}${amount}`;
}
