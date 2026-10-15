'use client';
// app/account/set-password/page.tsx
// Last step for a guest who chose "Save my details" after ordering: the
// email link signs them in, and here they pick a password for next time.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowserClient } from '@/lib/supabase/client';

export default function SetPasswordPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: updateError } = await supabaseBrowserClient().auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }
    router.push('/account/orders');
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="font-display text-2xl mb-2">Choose a password</h1>
      <p className="text-sm text-[var(--color-ink-soft)] mb-6">Your email is confirmed. Set a password to sign in next time.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
          className="focus-ring w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        <button
          type="submit" disabled={loading}
          className="focus-ring w-full bg-[var(--color-charcoal)] text-white font-semibold px-5 py-2.5 rounded hover:bg-black disabled:opacity-60"
        >
          {loading ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </div>
  );
}
