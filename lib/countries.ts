// lib/countries.ts
// Trimmed common list — extend as needed. code = ISO 3166-1 alpha-2.
export const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'GH', name: 'Ghana' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'KE', name: 'Kenya' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'AU', name: 'Australia' },
  { code: 'IN', name: 'India' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'BR', name: 'Brazil' },
  { code: 'JM', name: 'Jamaica' },
] as const;

export function currencyForCountry(countryCode: string): 'USD' | 'GHS' | 'NGN' {
  if (countryCode === 'GH') return 'GHS';
  if (countryCode === 'NG') return 'NGN';
  return 'USD';
}
