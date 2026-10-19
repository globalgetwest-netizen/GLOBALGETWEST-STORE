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
        Thanks — you&apos;re on the list.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row sm:flex-wrap gap-3 max-w-md w-full">
      <label htmlFor="newsletter-email" className="sr-only">Email address</label>
      <input
        id="newsletter-email"
        type="email"
        autoComplete="email"
        required
        placeholder="Your email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="field flex-1 px-4 text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)]"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="btn btn-primary whitespace-nowrap"
      >
        {status === 'loading' ? 'Joining…' : 'Subscribe'}
      </button>
      {status === 'error' && (
        <p role="alert" className="basis-full text-sm text-[var(--color-danger)]">{error}</p>
      )}
    </form>
  );
}
