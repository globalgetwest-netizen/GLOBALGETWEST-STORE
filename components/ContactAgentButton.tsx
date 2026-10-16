'use client';
// components/ContactAgentButton.tsx
import { useState } from 'react';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import { loadPrivateContactNumber, whatsappLink } from '@/lib/contact';

interface Props {
  label: string;
  /** Empty for the private (Africa) contact — loaded on click instead. */
  phone: string;
  whatsappNumber: string;
  message: string;
  /** If true, the number shows right away (used for the non-sensitive
   * contacts). If false, nothing about the number renders until the user
   * clicks; for the private contact it isn't even in the page or the
   * JavaScript until then. */
  revealImmediately?: boolean;
}

export function ContactAgentButton({ label, phone, whatsappNumber, message, revealImmediately = false }: Props) {
  const [revealed, setRevealed] = useState(revealImmediately);
  const [number, setNumber] = useState({ phone, whatsapp: whatsappNumber });
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function reveal() {
    if (number.whatsapp) {
      setRevealed(true);
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      setNumber(await loadPrivateContactNumber());
      setRevealed(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  if (!revealed || !number.whatsapp) {
    return (
      <button
        onClick={reveal}
        disabled={loading}
        className="focus-ring flex items-center gap-2 text-sm hover:text-[var(--color-forest)] hover:underline disabled:opacity-60"
      >
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-label="Active" />
        <WhatsAppIcon size={16} />
        {loading ? 'Connecting…' : failed ? `Try again — ${label}` : `Chat with Agent — ${label}`}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-label="Active" />
      <WhatsAppIcon size={16} />
      <a
        href={whatsappLink(number.whatsapp, message)}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-[var(--color-forest)] hover:underline"
      >
        {label}: {number.phone}
      </a>
    </div>
  );
}
