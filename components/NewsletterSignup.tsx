'use client';
// components/NewsletterSignup.tsx
import { useState } from 'react';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  if (status === 'success') {
    return (
      <p className="text-sm text-[var(--color-ink)]">
        Thanks — you're on the list.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md">
      <input
        type="email"
        required
        placeholder="Your email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="focus-ring flex-1 rounded px-4 py-2.5 text-sm text-[var(--color-ink)] bg-white border border-[var(--color-border)] placeholder:text-[var(--color-ink-soft)]"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="focus-ring bg-[var(--color-charcoal)] text-white font-semibold px-6 py-2.5 rounded hover:bg-black transition-colors disabled:opacity-60 whitespace-nowrap"
      >
        {status === 'loading' ? 'Joining…' : 'Subscribe'}
      </button>
      {status === 'error' && (
        <p className="text-sm text-[var(--color-danger)] sm:absolute sm:mt-12">{error}</p>
      )}
    </form>
  );
}
