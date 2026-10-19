'use client';
// app/account/sign-in/page.tsx
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowserClient } from '@/lib/supabase/client';
import { readGuestCart, restoreGuestCart } from '@/lib/guestCart';
import { safeNextPath } from '@/lib/safeNext';
import { AuthCard, FormNotice } from '@/components/AuthCard';
import { PasswordInput } from '@/components/PasswordInput';

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}

function friendlyError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'That email and password don’t match. Please try again, or reset your password below.';
  if (/email not confirmed/i.test(message)) return 'Please confirm your email first — open the link we sent to your inbox.';
  return message;
}

function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get('next'));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    const supabase = supabaseBrowserClient();
    const guestCart = await readGuestCart(supabase);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(friendlyError(signInError.message));
      setLoading(false);
      return;
    }

    await restoreGuestCart(guestCart);
    router.push(next);
    router.refresh();
  }

  async function sendReset() {
    setError('');
    setNotice('');
    if (!email) {
      setError('Enter your email above first, then choose “Forgot password?”.');
      return;
    }
    const { error: resetError } = await supabaseBrowserClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/account/set-password')}`,
    });
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setNotice(`If an account exists for ${email}, we’ve sent a link to choose a new password.`);
  }

  const fromCheckout = next.startsWith('/checkout') || next.startsWith('/cart');

  return (
    <AuthCard
      eyebrow="Welcome back"
      title="Sign in"
      subtitle="Access your orders, receipts and health records."
      footer={
        <>
          New to GLOBALGETWEST?{' '}
          <Link href={`/account/sign-up?next=${encodeURIComponent(next)}`} className="focus-ring text-[var(--color-forest)] font-semibold hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="signin-email" className="field-label">Email</label>
          <input
            id="signin-email" type="email" required autoComplete="email" inputMode="email"
            value={email} onChange={(e) => setEmail(e.target.value)} className="field"
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="signin-password" className="field-label">Password</label>
            <button type="button" onClick={sendReset} className="focus-ring text-xs font-semibold text-[var(--color-forest)] hover:underline">
              Forgot password?
            </button>
          </div>
          <PasswordInput id="signin-password" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>

        {error && <FormNotice tone="error">{error}</FormNotice>}
        {notice && <FormNotice tone="success">{notice}</FormNotice>}

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        {fromCheckout && (
          <>
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
              <span className="h-px flex-1 bg-[var(--color-border)]" />or<span className="h-px flex-1 bg-[var(--color-border)]" />
            </div>
            <Link href={next} className="btn btn-secondary w-full">Continue as guest</Link>
          </>
        )}
      </form>
    </AuthCard>
  );
}
