'use client';
// app/account/set-password/page.tsx
// Where the email link lands when someone picks a password: a guest who
// chose "Save my details" after ordering, or anyone who used
// "Forgot password?" on the sign-in page.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowserClient } from '@/lib/supabase/client';
import { AuthCard, FormNotice } from '@/components/AuthCard';
import { PasswordInput } from '@/components/PasswordInput';

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
      setError(/session/i.test(updateError.message)
        ? 'This link has expired. Please request a new one from the sign-in page.'
        : updateError.message);
      setLoading(false);
      return;
    }
    router.push('/account/orders');
    router.refresh();
  }

  return (
    <AuthCard eyebrow="Your account" title="Choose a password" subtitle="Your email is confirmed. Set a password to sign in next time.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="new-password" className="field-label">New password</label>
          <PasswordInput
            id="new-password" value={password} onChange={setPassword}
            autoComplete="new-password" minLength={8} describedBy="new-password-hint"
          />
          <p id="new-password-hint" className="field-hint">At least 8 characters.</p>
        </div>
        {error && <FormNotice tone="error">{error}</FormNotice>}
        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </AuthCard>
  );
}
