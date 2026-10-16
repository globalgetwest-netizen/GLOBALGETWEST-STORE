'use client';
// components/WhatsAppAction.tsx
// A full-width button that contacts the regional agent — on WhatsApp with a
// message already written, or by phone call. The link is built only on
// click; for the private (Africa) agents the number itself is fetched on
// click, so it is never in the page or the site's JavaScript.
import { useState } from 'react';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import { loadPrivateContactNumbers, telLink, whatsappLink } from '@/lib/contact';

export function WhatsAppAction({
  whatsappNumber, message, label, variant = 'primary', agentIndex = 0, call = false, phone = '',
}: {
  /** Empty for the private (Africa) agents — loaded on click. */
  whatsappNumber: string;
  message: string;
  label: string;
  variant?: 'primary' | 'secondary';
  /** Which private agent to use (0 = orders & bank transfer, 1 = Western Union). */
  agentIndex?: number;
  /** Phone call instead of WhatsApp. */
  call?: boolean;
  phone?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function open() {
    if (whatsappNumber) {
      if (call) window.location.href = telLink(phone);
      else window.open(whatsappLink(whatsappNumber, message), '_blank', 'noopener,noreferrer');
      return;
    }
    // Private agent: open the WhatsApp tab synchronously (so pop-up
    // blockers allow it), then point it at WhatsApp once the number loads.
    const tab = call ? null : window.open('', '_blank');
    setBusy(true);
    try {
      const agents = await loadPrivateContactNumbers();
      const agent = agents[agentIndex] ?? agents[0];
      if (call) {
        window.location.href = telLink(agent.phone);
      } else if (tab) {
        tab.opener = null;
        tab.location.href = whatsappLink(agent.whatsapp, message);
      } else {
        window.location.href = whatsappLink(agent.whatsapp, message);
      }
    } catch {
      tab?.close();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      className={`focus-ring w-full inline-flex items-center justify-center gap-2 rounded px-5 py-3 font-semibold transition-colors disabled:opacity-60 ${
        variant === 'primary'
          ? 'bg-[var(--color-charcoal)] text-white hover:bg-black'
          : 'border border-[var(--color-charcoal)] text-[var(--color-ink)] hover:bg-[var(--color-parchment-warm)]'
      }`}
    >
      {call ? (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
        </svg>
      ) : (
        <WhatsAppIcon size={18} />
      )}
      {busy ? (call ? 'Connecting…' : 'Opening WhatsApp…') : label}
    </button>
  );
}
