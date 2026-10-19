// components/health/MfaRequired.tsx
// Shown instead of patient records to a practitioner or admin whose session
// hasn't passed two-step sign-in. The database refuses the records anyway
// (RLS checks aal2); this just explains why and how to fix it.
import Link from 'next/link';

export function MfaRequired({ hasFactor, next, audience }: {
  hasFactor: boolean;
  next: string;
  audience: 'practitioner' | 'admin';
}) {
  const href = `/account/security?next=${encodeURIComponent(next)}`;
  return (
    <div className="max-w-xl border border-[var(--color-border)] rounded-lg bg-white p-8">
      <div className="h-11 w-11 rounded-full bg-[var(--color-parchment-warm)] border border-[var(--color-border)] flex items-center justify-center mb-5">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--color-forest)" strokeWidth="2" aria-hidden="true">
          <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" />
        </svg>
      </div>
      <h1 className="font-display text-2xl mb-3">
        {hasFactor ? 'Confirm it’s you' : 'Turn on two-step sign-in'}
      </h1>
      <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mb-2">
        Patient records are sensitive health data. {audience === 'practitioner' ? 'Practitioners' : 'Administrators'} can
        only open them after signing in with a password <strong>and</strong> a code from an authenticator app.
      </p>
      <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mb-6">
        {hasFactor
          ? 'Your account has an authenticator set up, but this session hasn’t been confirmed with it yet.'
          : 'It takes about a minute with Google Authenticator, Microsoft Authenticator, 1Password or any similar app.'}
      </p>
      <Link
        href={href}
        className="btn btn-primary"
      >
        {hasFactor ? 'Enter authenticator code' : 'Set up two-step sign-in'}
      </Link>
    </div>
  );
}
