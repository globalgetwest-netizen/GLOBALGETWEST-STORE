'use client';
// components/health/ConsentScreen.tsx
// First visit to /account/health: the consent notice, then either a new
// record (the patient's own details) or linking a record a practitioner
// already started, using the code they were given.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ConsentSection } from '@/lib/health/consent';
import { SEXES, SEX_LABELS } from '@/lib/health/labels';

const input = 'field';

export function ConsentScreen({
  sections, statement, version, countries, defaultName, defaultCountry,
}: {
  sections: ConsentSection[];
  statement: string;
  version: string;
  countries: { code: string; name: string }[];
  defaultName: string;
  defaultCountry: string;
}) {
  const [mode, setMode] = useState<'new' | 'code'>('new');
  const [agreed, setAgreed] = useState(false);
  const [fullName, setFullName] = useState(defaultName);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState(defaultCountry);
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = mode === 'new'
        ? await fetch('/api/health/consent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agreed, consentVersion: version, fullName, dateOfBirth, sex: sex || null, phone, countryCode }),
          })
        : await fetch('/api/health/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agreed, consentVersion: version, code }),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  }

  return (
    <div>
      <section className="border border-[var(--color-border)] rounded-lg bg-white p-6 md:p-8">
        <h2 className="font-display text-2xl mb-1">Before we start your health record</h2>
        <p className="text-sm text-[var(--color-ink-soft)] mb-6">Please read this carefully — it explains exactly what we keep and who can see it.</p>
        <div className="space-y-5">
          {sections.map((s) => (
            <div key={s.heading}>
              <h3 className="font-sans text-sm font-semibold uppercase tracking-wide text-[var(--color-forest)] mb-2">{s.heading}</h3>
              <ul className="space-y-1.5 text-sm leading-relaxed text-[var(--color-ink)] list-disc pl-5 marker:text-[var(--color-ochre)]">
                {s.points.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--color-ink-muted)] mt-6">Notice version {version}</p>
      </section>

      <form onSubmit={submit} className="mt-6 border border-[var(--color-border)] rounded-lg bg-white p-6 md:p-8">
        <div role="tablist" aria-label="How to start" className="inline-flex rounded-md border border-[var(--color-border)] p-0.5 mb-6 text-sm">
          {([['new', 'Start my record'], ['code', 'I have a code from my practitioner']] as const).map(([m, label]) => (
            <button
              key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(''); }}
              className={`focus-ring px-3.5 py-1.5 rounded ${mode === m ? 'bg-[var(--color-charcoal)] text-white font-semibold' : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'new' ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="c-name" className="field-label">Full name</label>
              <input id="c-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} className={input} />
            </div>
            <div>
              <label htmlFor="c-dob" className="field-label">Date of birth</label>
              <input id="c-dob" type="date" required value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} max={new Date().toISOString().slice(0, 10)} className={input} />
            </div>
            <div>
              <label htmlFor="c-sex" className="field-label">Sex</label>
              <select id="c-sex" value={sex} onChange={(e) => setSex(e.target.value)} className={input}>
                <option value="">Choose…</option>
                {SEXES.map((s) => <option key={s} value={s}>{SEX_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="c-phone" className="field-label">Phone / WhatsApp <span className="font-normal text-[var(--color-ink-muted)]">(optional)</span></label>
              <input id="c-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} className={input} />
            </div>
            <div>
              <label htmlFor="c-country" className="field-label">Country</label>
              <select id="c-country" required value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className={input}>
                <option value="">Choose…</option>
                {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
          </div>
        ) : (
          <div className="max-w-xs">
            <label htmlFor="c-code" className="field-label">Your record code</label>
            <input
              id="c-code" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABCD-2345" maxLength={12}
              className={`${input} tracking-[0.2em] font-medium uppercase`}
            />
            <p className="text-xs text-[var(--color-ink-muted)] mt-1.5">
              Your practitioner gives you this after your consultation. If they used your email, sign in with that same email.
            </p>
          </div>
        )}

        <label className="flex items-start gap-3 mt-6 text-sm leading-relaxed cursor-pointer">
          <input type="checkbox" required checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-forest)]" />
          <span>{statement}</span>
        </label>

        {error && <p className="text-sm text-[var(--color-danger)] mt-4">{error}</p>}

        <button
          type="submit" disabled={saving || !agreed}
          className="btn btn-primary mt-6"
        >
          {saving ? 'Saving…' : mode === 'new' ? 'Agree and create my record' : 'Agree and link my record'}
        </button>
      </form>
    </div>
  );
}
