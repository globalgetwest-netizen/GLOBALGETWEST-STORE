// components/AuthCard.tsx
// The shared frame for sign-in, sign-up, password and two-step pages:
// logo, heading, a white card for the form, and a footer line.
import Image from 'next/image';

export function AuthCard({ eyebrow, title, subtitle, children, footer }: {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[440px] px-4 py-12 sm:py-16">
      <div className="text-center mb-7">
        <Image src="/logo.png" alt="" width={52} height={52} className="mx-auto rounded-full mb-4" priority />
        {eyebrow && (
          <p className="uppercase tracking-[0.2em] text-[var(--color-forest)] text-[11px] font-semibold mb-2">{eyebrow}</p>
        )}
        <h1 className="font-display text-3xl leading-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-[var(--color-ink-soft)] leading-relaxed">{subtitle}</p>}
      </div>
      <div className="form-card p-6 sm:p-8">{children}</div>
      {footer && <div className="mt-6 text-center text-sm text-[var(--color-ink-soft)]">{footer}</div>}
    </div>
  );
}

/** A form-level message (error or success) shown above the submit button. */
export function FormNotice({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  const styles = tone === 'error'
    ? 'border-[var(--color-danger)]/25 bg-[var(--color-danger)]/[0.06] text-[var(--color-danger)]'
    : 'border-[var(--color-forest)]/20 bg-[var(--color-forest)]/[0.05] text-[var(--color-forest)]';
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3.5 py-2.5 text-sm leading-relaxed ${styles}`}>
      {children}
    </p>
  );
}
