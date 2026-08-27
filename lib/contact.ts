// lib/contact.ts
export const SUPPORT_EMAIL = 'support@globalgetwest.com';

// Two regional contacts for manual payment arrangement (bank transfer /
// Western Union) — this is deliberately separate from the real payment
// gateways (Paystack/Grey/etc.), which are untouched. This is an
// additional manual option, not a replacement.
export const CONTACTS = {
  usEurope: { phone: '+16465733609', whatsapp: '16465733609', label: 'USA & Europe' },
  asiaAfrica: { phone: '+233593088343', whatsapp: '233593088343', label: 'Asia & Africa' },
};

// North America + Europe country codes route to the US/Europe contact;
// everything else (Africa, Asia, South America, Oceania) routes to the
// second contact — a reasonable split given the two buckets described,
// though not explicitly spelled out for every region.
const US_EUROPE_COUNTRIES = new Set([
  'US', 'CA',
  'GB', 'IE', 'FR', 'DE', 'IT', 'ES', 'PT', 'NL', 'BE', 'LU', 'CH', 'AT',
  'DK', 'SE', 'NO', 'FI', 'IS', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'GR',
  'HR', 'SI', 'EE', 'LV', 'LT', 'MT', 'CY', 'AD', 'MC', 'SM', 'VA', 'LI',
  'ME', 'MK', 'AL', 'BA', 'RS', 'MD', 'UA', 'BY',
]);

export function contactForCountry(countryCode: string) {
  return US_EUROPE_COUNTRIES.has(countryCode) ? CONTACTS.usEurope : CONTACTS.asiaAfrica;
}

export function whatsappLink(whatsappNumber: string, message: string): string {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
