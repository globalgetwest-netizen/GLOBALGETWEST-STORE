'use client';
// components/CopyButton.tsx
import { useState } from 'react';

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked (e.g. some in-app browsers); the value is
      // still visible on screen to copy by hand.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${value}`}
      className="focus-ring inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-ink-soft)] hover:border-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
    >
      {copied ? (
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" />
        </svg>
      )}
      {copied ? 'Copied' : label}
    </button>
  );
}
