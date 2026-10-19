'use client';
// components/SaveGuestDetails.tsx
// Shown on the order page to guests (people who checked out without an
// account). One optional click turns their guest session into a real
// account with the same orders — nothing is required to finish buying.
import { useState } from 'react';
import { supabaseBrowserClient } from '@/lib/supabase/client';

export function SaveGuestDetails({ email: initialEmail }: { email: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function save() {
    setStatus('loading');
    setError('');
    const supabase = supabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser(
      { email: email.trim() },
      { emailRedirectTo: `${window.location.origin}/auth/callback?next=/account/set-password` },
    );
    if (updateError) {
      setStatus('error');
      setError(
        /already/i.test(updateError.message)
          ? 'You already have an account with this email. Sign in next time to see your orders in one place.'
          : updateError.message,
      );
      return;
    }
    setStatus('sent');
  }

  if (status === 'sent') {
    return (
      <div className="border border-[var(--color-border)] rounded-lg p-5 bg-white/60 text-sm text-left">
        <p className="font-medium mb-1">Check your inbox</p>
        <p className="text-[var(--color-ink-soft)]">
          We sent a link to <strong>{email}</strong>. Open it to choose a password and track your orders anytime.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[var(--color-border)] rounded-lg p-5 bg-white/60 text-sm text-left">
      <p className="font-medium mb-1">Track your orders anytime (optional)</p>
      <p className="text-[var(--color-ink-soft)] mb-3">Save your details and we&apos;ll email you a link to set a password.</p>
      <div className="flex gap-2">
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="field flex-1"
        />
        <button
          onClick={save}
          disabled={status === 'loading' || !email.trim()}
          className="btn btn-primary"
        >
          {status === 'loading' ? 'Saving…' : 'Save my details'}
        </button>
      </div>
      {status === 'error' && <p className="mt-2 text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}
