// lib/contactPrivate.ts
// The Africa agent's number. Kept out of lib/contact.ts so it never ships
// in the browser JavaScript or in public page HTML — visitors get it only
// by clicking (via /api/agent-contact), and it's printed only on an
// African customer's own invoice.
//
// SERVER-ONLY: import this from route handlers and server components only,
// never from a 'use client' file.
import type { AgentContact } from './contact';

export const AFRICA_AGENT_NUMBER = { phone: '+233599086351', whatsapp: '233599086351' };

/** Fill in the real number for a private contact (server-side use only). */
export function withPrivateNumber(contact: AgentContact): AgentContact {
  return contact.private ? { ...contact, ...AFRICA_AGENT_NUMBER } : contact;
}
