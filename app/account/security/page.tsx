'use client';
// app/account/security/page.tsx
// Two-step sign-in (TOTP authenticator app) using Supabase Auth MFA.
// Required for practitioners and admins before they can open patient
// records; available to any customer who wants it.
import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowserClient } from '@/lib/supabase/client';

type State =
  | { step: 'loading' }
  | { step: 'off' }
  | { step: 'signed-out' }
  | { step: 'enabled' }                                        // aal2 now
  | { step: 'challenge'; factorId: string }                    // factor exists, session is aal1
  | { step: 'enroll'; factorId: string; qr: string; secret: string };

export default function SecurityPage() {
  return (
    <Suspense fallback={null}>
      <SecuritySettings />
    </Suspense>
  );
}

function safeNext(value: string | null): string | null {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null;
}

function SecuritySettings() {
  const [state, setState] = useState<State>({ step: 'loading' });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));

  const load = useCallback(async () => {
    const supabase = supabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.is_anonymous) {
      setState({ step: 'signed-out' });
      return;
    }
    const [{ data: aal }, { data: factors }] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);
    const verified = factors?.totp.find((f) => f.status === 'verified');
    if (verified && aal?.currentLevel === 'aal2') setState({ step: 'enabled' });
    else if (verified) setState({ step: 'challenge', factorId: verified.id });
    else setState((s) => (s.step === 'enroll' ? s : { step: 'off' }));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads auth state once on mount
    load();
  }, [load]);

  async function startEnrolment() {
    setBusy(true);
    setError('');
    const supabase = supabaseBrowserClient();
    // Clear any half-finished setup from an earlier attempt first.
    const { data: factors } = await supabase.auth.mfa.listFactors();
    for (const f of factors?.all ?? []) {
      if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
    });
    setBusy(false);
    if (enrollError || !data) {
      setError(enrollError?.message ?? 'Two-step sign-in could not be started');
      return;
    }
    setState({ step: 'enroll', factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verify(factorId: string) {
    setBusy(true);
    setError('');
    const supabase = supabaseBrowserClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, '') });
    setBusy(false);
    if (verifyError) {
      setError('That code didn’t work. Check the time on your phone is correct and try the newest code.');
      return;
    }
    setCode('');
    if (next) {
      router.push(next);
      router.refresh();
    } else {
      setState({ step: 'enabled' });
      router.refresh();
    }
  }

  const codeInput = (factorId: string, label: string) => (
    <form onSubmit={(e) => { e.preventDefault(); verify(factorId); }} className="space-y-3 mt-6">
      <label htmlFor="mfa-code" className="field-label">{label}</label>
      <input
        id="mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required
        value={code} onChange={(e) => setCode(e.target.value)} placeholder="123 456"
        className="field w-40 text-lg tracking-[0.3em] font-medium"
      />
      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      <button
        type="submit" disabled={busy}
        className="btn btn-primary w-full"
      >
        {busy ? 'Checking…' : 'Confirm'}
      </button>
    </form>
  );

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-ochre)] mb-2">Account security</p>
      <h1 className="font-display text-3xl mb-3">Two-step sign-in</h1>
      <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mb-8">
        After your password, you&apos;ll also enter a 6-digit code from an authenticator app on your phone
        (Google Authenticator, Microsoft Authenticator, 1Password, Authy…). Practitioners and administrators
        need this to open patient records.
      </p>

      <div className="border border-[var(--color-border)] rounded-lg bg-white p-6">
        {state.step === 'loading' && <p className="text-sm text-[var(--color-ink-soft)]">Checking your account…</p>}

        {state.step === 'off' && (
          <div>
            <p className="text-sm text-[var(--color-ink-soft)] mb-5">Two-step sign-in is <strong>off</strong> for your account.</p>
            {error && <p className="text-sm text-[var(--color-danger)] mb-3">{error}</p>}
            <button
              type="button" onClick={startEnrolment} disabled={busy}
              className="btn btn-primary"
            >
              {busy ? 'Starting…' : 'Set up two-step sign-in'}
            </button>
          </div>
        )}

        {state.step === 'signed-out' && (
          <p className="text-sm">
            Please <Link href="/account/sign-in?next=/account/security" className="focus-ring text-[var(--color-forest)] font-medium hover:underline">sign in</Link> first.
          </p>
        )}

        {state.step === 'enabled' && (
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-[#2F5D3A]">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
              Two-step sign-in is on, and this session is confirmed.
            </p>
            {next && (
              <Link href={next} className="btn btn-primary mt-5">
                Continue
              </Link>
            )}
          </div>
        )}

        {state.step === 'challenge' && (
          <div>
            <p className="text-sm text-[var(--color-ink-soft)]">
              Two-step sign-in is on. Open your authenticator app to confirm this session.
            </p>
            {codeInput(state.factorId, 'Code from your authenticator app')}
          </div>
        )}

        {state.step === 'enroll' && (
          <div>
            <ol className="text-sm space-y-2 list-decimal list-inside text-[var(--color-ink)]">
              <li>Open your authenticator app and add a new account.</li>
              <li>Scan this QR code, or type the key below.</li>
              <li>Enter the 6-digit code the app shows.</li>
            </ol>
            <div className="mt-5 flex flex-col sm:flex-row gap-5 items-start">
              {/* eslint-disable-next-line @next/next/no-img-element -- data: URL SVG from Supabase, not a remote image */}
              <img src={state.qr} alt="QR code for your authenticator app" width={180} height={180} className="border border-[var(--color-border)] rounded bg-white p-2" />
              <div className="min-w-0">
                <p className="text-xs text-[var(--color-ink-soft)] mb-1">Can&apos;t scan? Enter this key:</p>
                <code className="block text-sm font-mono break-all bg-[var(--color-parchment-warm)] border border-[var(--color-border)] rounded px-2.5 py-2 select-all">
                  {state.secret}
                </code>
              </div>
            </div>
            {codeInput(state.factorId, 'Code from the app')}
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--color-ink-muted)] mt-6">
        Lost your phone? Contact an administrator to reset two-step sign-in on your account.
      </p>
    </div>
  );
}
