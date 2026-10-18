// lib/health/claimCode.ts
// One-time codes that let a patient registered by a practitioner (walk-in,
// phone or WhatsApp consultation) link that record to their own account.
// Only the SHA-256 hash is stored; the code itself is shown once.
import { createHash, randomInt } from 'node:crypto';

// No 0/O, 1/I/L — codes get read out over the phone.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CLAIM_CODE_DAYS = 30;

export function generateClaimCode(): { code: string; hash: string; expiresAt: string } {
  let raw = '';
  for (let i = 0; i < 8; i++) raw += ALPHABET[randomInt(ALPHABET.length)];
  const expiresAt = new Date(Date.now() + CLAIM_CODE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  return { code: `${raw.slice(0, 4)}-${raw.slice(4)}`, hash: hashClaimCode(raw), expiresAt };
}

export function hashClaimCode(code: string): string {
  const normalised = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return createHash('sha256').update(normalised).digest('hex');
}
