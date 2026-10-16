// lib/contact.ts
export const SUPPORT_EMAIL = 'support@globalgetwest.com';

// Regional agents for manual payment (bank transfer / Western Union) and
// questions — separate from the online gateways (Paystack etc.). Every
// number is shown openly; `display` is the human-friendly format.
export interface AgentNumber {
  phone: string;
  display: string;
  whatsapp: string;
  /** What this agent handles, e.g. 'Western Union' — shown next to the number. */
  role?: string;
  /** Offer a tap-to-call link as well as WhatsApp. */
  callable?: boolean;
}

export interface AgentContact {
  label: string;
  /** Main agent for the region (first in `agents`). */
  phone: string;
  display: string;
  whatsapp: string;
  agents: AgentNumber[];
}

const US_EUROPE_AGENT: AgentNumber = { phone: '+16465733609', display: '+1 646 573 3609', whatsapp: '16465733609' };
const ASIA_AGENT: AgentNumber = { phone: '+971600337701', display: '+971 600 337 701', whatsapp: '971600337701' };
// Both serve every African country: agent 1 for orders and bank transfer,
// agent 2 is the Western Union desk (phone call as well as WhatsApp).
const AFRICA_AGENTS: AgentNumber[] = [
  { phone: '+233599086351', display: '+233 59 908 6351', whatsapp: '233599086351', role: 'Orders & bank transfer' },
  { phone: '+233246590317', display: '+233 24 659 0317', whatsapp: '233246590317', role: 'Western Union', callable: true },
];

function region(label: string, agents: AgentNumber[]): AgentContact {
  const main = agents[0];
  return { label, phone: main.phone, display: main.display, whatsapp: main.whatsapp, agents };
}

export const CONTACTS: Record<'usEurope' | 'africa' | 'asia', AgentContact> = {
  usEurope: region('USA & Europe', [US_EUROPE_AGENT]),
  africa: region('Africa', AFRICA_AGENTS),
  asia: region('Asia', [ASIA_AGENT]),
};

/** The region's dedicated Western Union desk, if it has one (Africa does). */
export function westernUnionDesk(contact: AgentContact): AgentNumber | undefined {
  return contact.agents.find((a) => a.role === 'Western Union');
}

export function telLink(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, '')}`;
}

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

export function contactForCountry(countryCode: string): AgentContact {
  if (US_EUROPE_COUNTRIES.has(countryCode)) return CONTACTS.usEurope;
  if (AFRICA_COUNTRIES.has(countryCode)) return CONTACTS.africa;
  if (ASIA_COUNTRIES.has(countryCode)) return CONTACTS.asia;
  if (OCEANIA_COUNTRIES.has(countryCode)) return { ...CONTACTS.asia, label: 'Asia-Pacific' };
  return { ...CONTACTS.asia, label: 'International' };
}

export function whatsappLink(whatsappNumber: string, message: string): string {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
