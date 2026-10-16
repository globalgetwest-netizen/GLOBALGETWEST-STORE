'use client';
// components/ContactAgentButton.tsx
import { useState } from 'react';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import { loadPrivateContactNumbers, telLink, whatsappLink, type AgentNumber } from '@/lib/contact';

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
  const [agents, setAgents] = useState<AgentNumber[]>(whatsappNumber ? [{ phone, whatsapp: whatsappNumber }] : []);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function reveal() {
    if (agents.length) {
      setRevealed(true);
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      setAgents(await loadPrivateContactNumbers());
      setRevealed(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  if (!revealed || !agents.length) {
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
    <div className="space-y-2">
      {agents.map((agent) => (
        <div key={agent.whatsapp} className="flex items-start gap-2 text-sm">
          <span className="flex items-center gap-2 shrink-0 h-5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" aria-label="Active" />
            <WhatsAppIcon size={16} />
          </span>
          <div className="min-w-0">
            <a
              href={whatsappLink(agent.whatsapp, message)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--color-forest)] hover:underline"
            >
              {agent.role ? `${label} · ${agent.role}` : label}:{' '}
              <span className="whitespace-nowrap">{agent.phone}</span>
            </a>
            {agent.callable && (
              <a
                href={telLink(agent.phone)}
                className="mt-1 flex w-fit items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs hover:border-[var(--color-forest)] hover:text-[var(--color-forest)]"
              >
                <PhoneIcon />
                Call
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  );
}
