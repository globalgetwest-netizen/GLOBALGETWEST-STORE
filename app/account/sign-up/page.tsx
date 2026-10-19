'use client';
// app/account/sign-up/page.tsx
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowserClient } from '@/lib/supabase/client';
import { readGuestCart, restoreGuestCart } from '@/lib/guestCart';
import { safeNextPath } from '@/lib/safeNext';
import { AuthCard, FormNotice } from '@/components/AuthCard';
import { PasswordInput } from '@/components/PasswordInput';

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get('next'));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = supabaseBrowserClient();
    const guestCart = await readGuestCart(supabase);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (signUpError) {
      setError(/already registered/i.test(signUpError.message)
        ? 'An account with this email already exists. Please sign in instead.'
        : signUpError.message);
      setLoading(false);
      return;
    }

    // If email confirmation is required, there's no session yet.
    if (!data.session) {
      setCheckEmail(true);
      setLoading(false);
      return;
    }

    await restoreGuestCart(guestCart);
    router.push(next);
    router.refresh();
  }

  if (checkEmail) {
    return (
      <AuthCard
        eyebrow="One more step"
        title="Check your email"
        subtitle={<>We&apos;ve sent a confirmation link to <strong className="text-[var(--color-ink)]">{email}</strong>. Open it to activate your account.</>}
      >
        <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
          Can&apos;t find it? Check your Spam or Promotions folder. The link comes from GLOBALGETWEST and works once.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      eyebrow="Join GLOBALGETWEST"
      title="Create your account"
      subtitle="Track orders, keep your receipts and, if you choose, your health records — in one place."
      footer={
        <>
          Already have an account?{' '}
          <Link href={`/account/sign-in?next=${encodeURIComponent(next)}`} className="focus-ring text-[var(--color-forest)] font-semibold hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="signup-name" className="field-label">Full name</label>
          <input
            id="signup-name" type="text" required autoComplete="name"
            value={fullName} onChange={(e) => setFullName(e.target.value)} className="field"
          />
        </div>
        <div>
          <label htmlFor="signup-email" className="field-label">Email</label>
          <input
            id="signup-email" type="email" required autoComplete="email" inputMode="email"
            value={email} onChange={(e) => setEmail(e.target.value)} className="field"
          />
        </div>
        <div>
          <label htmlFor="signup-password" className="field-label">Password</label>
          <PasswordInput
            id="signup-password" value={password} onChange={setPassword}
            autoComplete="new-password" minLength={8} describedBy="signup-password-hint"
          />
          <p id="signup-password-hint" className="field-hint">At least 8 characters.</p>
        </div>

        {error && <FormNotice tone="error">{error}</FormNotice>}

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? 'Creating your account…' : 'Create account'}
        </button>
      </form>
    </AuthCard>
  );
}
