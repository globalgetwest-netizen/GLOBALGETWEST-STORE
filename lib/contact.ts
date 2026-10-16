// lib/contact.ts
export const SUPPORT_EMAIL = 'support@globalgetwest.com';

// Three regional contacts for manual payment arrangement (bank transfer /
// Western Union) — this is deliberately separate from the real payment
// gateways (Paystack/Grey/etc.), which are untouched. This is an
// additional manual option, not a replacement.
export const CONTACTS = {
  usEurope: { phone: '+16465733609', whatsapp: '16465733609', label: 'USA & Europe' },
  africa: { phone: '+233599086351', whatsapp: '233599086351', label: 'Africa' },
  asia: { phone: '+971600337701', whatsapp: '971600337701', label: 'Asia' },
};

// North America + Europe route to the US/Europe contact. Africa and Asia
// are now split into their own separate contacts (previously combined into
// one "Asia & Africa" bucket) — everything else not explicitly African or
// European/American falls to the Asia contact as a reasonable catch-all.
const US_EUROPE_COUNTRIES = new Set([
  'US', 'CA',
  'GB', 'IE', 'FR', 'DE', 'IT', 'ES', 'PT', 'NL', 'BE', 'LU', 'CH', 'AT',
  'DK', 'SE', 'NO', 'FI', 'IS', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'GR',
  'HR', 'SI', 'EE', 'LV', 'LT', 'MT', 'CY', 'AD', 'MC', 'SM', 'VA', 'LI',
  'ME', 'MK', 'AL', 'BA', 'RS', 'MD', 'UA', 'BY',
]);

const AFRICA_COUNTRIES = new Set([
  'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CM', 'CF', 'TD', 'KM', 'CG',
  'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH', 'GN',
  'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'MA', 'MZ',
  'NA', 'NE', 'NG', 'RW', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'TZ',
  'TG', 'TN', 'UG', 'ZM', 'ZW',
]);

// Asia (including the Middle East) and Oceania. Anywhere not in a named
// region (Latin America, the Caribbean, Russia, …) is still served by the
// Asia desk's number, but labelled "International" so a customer in, say,
// Brazil or Australia isn't told to contact an "Asia" agent.
const ASIA_COUNTRIES = new Set([
  'AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'IN', 'ID',
  'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KW', 'KG', 'LA', 'LB', 'MY', 'MV',
  'MN', 'MM', 'NP', 'OM', 'PK', 'PH', 'QA', 'SA', 'SG', 'KR', 'LK', 'TW',
  'TJ', 'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE',
]);

const OCEANIA_COUNTRIES = new Set(['AU', 'NZ', 'FJ', 'PG', 'SB', 'VU', 'WS', 'TO', 'KI', 'NR']);

export function contactForCountry(countryCode: string) {
  if (US_EUROPE_COUNTRIES.has(countryCode)) return CONTACTS.usEurope;
  if (AFRICA_COUNTRIES.has(countryCode)) return CONTACTS.africa;
  if (ASIA_COUNTRIES.has(countryCode)) return CONTACTS.asia;
  if (OCEANIA_COUNTRIES.has(countryCode)) return { ...CONTACTS.asia, label: 'Asia-Pacific' };
  return { ...CONTACTS.asia, label: 'International' };
}

export function whatsappLink(whatsappNumber: string, message: string): string {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
