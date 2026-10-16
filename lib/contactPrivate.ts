// lib/contactPrivate.ts
// The Africa agents' numbers. Kept out of lib/contact.ts so they never ship
// in the browser JavaScript or in public page HTML — visitors get them only
// by clicking (via /api/agent-contact), and they're printed only on an
// African customer's own invoice.
//
// SERVER-ONLY: import this from route handlers and server components only,
// never from a 'use client' file.
import type { AgentContact, AgentNumber } from './contact';

// Both serve every African country. Agent 1 handles orders and bank
// transfer (and is the default for one-tap WhatsApp buttons); agent 2 is
// the Western Union desk, reachable by phone call as well as WhatsApp.
export const AFRICA_AGENT_NUMBERS: AgentNumber[] = [
  { phone: '+233599086351', whatsapp: '233599086351', role: 'Orders & bank transfer' },
  { phone: '+233246590317', whatsapp: '233246590317', role: 'Western Union', callable: true },
];

/** Fill in the real numbers for a private contact (server-side use only). */
export function withPrivateNumber(contact: AgentContact): AgentContact & { agents: AgentNumber[] } {
  if (!contact.private) return { ...contact, agents: [{ phone: contact.phone, whatsapp: contact.whatsapp }] };
  const first = AFRICA_AGENT_NUMBERS[0];
  return { ...contact, phone: first.phone, whatsapp: first.whatsapp, agents: AFRICA_AGENT_NUMBERS };
}
