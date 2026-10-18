// lib/email.ts
// Transactional email through Brevo's free plan (300 emails/day).
//
// Switched off until these are set in Vercel → Settings → Environment
// Variables (then redeploy):
//   BREVO_API_KEY       — Brevo → SMTP & API → API keys
//   EMAIL_FROM_ADDRESS  — a sender verified in Brevo → Senders & IP
//                         (defaults to support@globalgetwest.com)
// Without a key, sendEmail() does nothing and returns false — the store
// works exactly as before. It never throws: an email problem must never
// break checkout or an order update.
import { SUPPORT_EMAIL } from './contact';

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

export type EmailMessage = {
  to: { email: string; name?: string };
  /** Where replies go. Defaults to the support address. */
  replyTo?: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
};

export function emailEnabled(): boolean {
  return !!process.env.BREVO_API_KEY;
}

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return false;

  try {
    const res = await fetch(BREVO_URL, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'GLOBALGETWEST', email: process.env.EMAIL_FROM_ADDRESS || SUPPORT_EMAIL },
        replyTo: message.replyTo ?? { email: SUPPORT_EMAIL, name: 'GLOBALGETWEST Support' },
        to: [message.to],
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      // Status only — never log the recipient or message contents.
      console.error(`Email send failed (Brevo ${res.status})`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Email send failed', err instanceof Error ? err.name : 'unknown error');
    return false;
  }
}

/** Escape text for safe use inside HTML. */
export function esc(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
