'use client';
// components/health/NewPatientForm.tsx
// Practitioner registers a patient after a consultation, confirms consent,
// and opens the first case. Shows the one-time record code at the end.
import { useState } from 'react';
import Link from 'next/link';
import { SEXES, SEX_LABELS } from '@/lib/health/labels';
import { FileInput } from '@/components/health/FileInput';
import { ClaimCodeNotice } from '@/components/health/ClaimCodeNotice';

const input = 'focus-ring w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm';

export function NewPatientForm({ countries, categories, consentStatement, consentPoints }: {
  countries: { code: string; name: string }[];
  categories: { id: string; name: string }[];
  consentStatement: string;
  consentPoints: string[];
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<{ caseId: string; claimCode: string; claimCodeExpiresAt: string } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const form = new FormData(e.currentTarget);
    form.delete('files');
    files.forEach((f) => form.append('files', f));
    try {
      const res = await fetch('/api/practitioner/patients', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.caseId) {
          setError(`${data.error ?? 'Something went wrong'} The case was opened — continue from the case page.`);
          setCreated(null);
          return;
        }
        throw new Error(data.error ?? 'The patient could not be registered');
      }
      setCreated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    return (
      <div className="space-y-6">
        <ClaimCodeNotice code={created.claimCode} expiresAt={created.claimCodeExpiresAt} />
        <Link
          href={`/practitioner/cases/${created.caseId}`}
          className="focus-ring inline-block bg-[var(--color-charcoal)] text-white font-semibold px-5 py-2.5 rounded hover:bg-black"
        >
          Go to the case
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="border border-[var(--color-border)] rounded-lg bg-white p-6">
        <h2 className="font-display text-xl mb-4">Patient</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="np-name" className="block text-sm font-medium mb-1.5">Full name</label>
            <input id="np-name" name="fullName" required maxLength={120} className={input} />
          </div>
          <div>
            <label htmlFor="np-dob" className="block text-sm font-medium mb-1.5">Date of birth <span className="font-normal text-[var(--color-ink-muted)]">(if known)</span></label>
            <input id="np-dob" name="dateOfBirth" type="date" max={new Date().toISOString().slice(0, 10)} className={input} />
          </div>
          <div>
            <label htmlFor="np-sex" className="block text-sm font-medium mb-1.5">Sex</label>
            <select id="np-sex" name="sex" className={input} defaultValue="">
              <option value="">Not recorded</option>
              {SEXES.map((s) => <option key={s} value={s}>{SEX_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="np-phone" className="block text-sm font-medium mb-1.5">Phone / WhatsApp</label>
            <input id="np-phone" name="phone" type="tel" maxLength={40} className={input} />
          </div>
          <div>
            <label htmlFor="np-email" className="block text-sm font-medium mb-1.5">Email</label>
            <input id="np-email" name="email" type="email" maxLength={254} className={input} />
            <p className="text-xs text-[var(--color-ink-muted)] mt-1">If given, the patient must sign in with this email to see the record.</p>
          </div>
          <div>
            <label htmlFor="np-country" className="block text-sm font-medium mb-1.5">Country</label>
            <select id="np-country" name="countryCode" required className={input} defaultValue="">
              <option value="">Choose…</option>
              {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="border border-[var(--color-border)] rounded-lg bg-white p-6">
        <h2 className="font-display text-xl mb-4">First case</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="np-condition" className="block text-sm font-medium mb-1.5">Condition</label>
            <input id="np-condition" name="condition" required maxLength={200} placeholder="e.g. Hypertension" className={input} />
          </div>
          <div>
            <label htmlFor="np-category" className="block text-sm font-medium mb-1.5">Category <span className="font-normal text-[var(--color-ink-muted)]">(optional)</span></label>
            <select id="np-category" name="categoryId" className={input} defaultValue="">
              <option value="">None</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="np-intake" className="block text-sm font-medium mb-1.5">Intake notes</label>
            <textarea
              id="np-intake" name="intake" required rows={6} maxLength={20000} className={input}
              placeholder="Presenting complaint, history, current medicines, allergies, observations (e.g. BP), what was discussed."
            />
            <p className="text-xs text-[var(--color-ink-muted)] mt-1">Visible to the patient. Entries can’t be edited after saving — use a correction.</p>
          </div>
          <div>
            <label htmlFor="np-status" className="block text-sm font-medium mb-1.5">Starting status</label>
            <select id="np-status" name="status" className={input} defaultValue="intake">
              <option value="intake">Intake — assessment not finished</option>
              <option value="active">In treatment</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <FileInput files={files} onChange={setFiles} label="Attachments (optional)" />
          </div>
        </div>
      </section>

      <section className="border border-[var(--color-ochre)] rounded-lg bg-white p-6">
        <h2 className="font-display text-xl mb-2">Consent</h2>
        <p className="text-sm text-[var(--color-ink-soft)] mb-3">Before creating the record, tell the patient:</p>
        <ul className="text-sm list-disc pl-5 space-y-1 marker:text-[var(--color-ochre)] mb-4">
          {consentPoints.map((p) => <li key={p}>{p}</li>)}
        </ul>
        <label className="flex items-start gap-3 text-sm leading-relaxed cursor-pointer">
          <input type="checkbox" name="consentConfirmed" value="yes" required className="mt-1 h-4 w-4 accent-[var(--color-forest)]" />
          <span>{consentStatement}</span>
        </label>
      </section>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      <button
        type="submit" disabled={saving}
        className="focus-ring bg-[var(--color-charcoal)] text-white font-semibold px-5 py-2.5 rounded hover:bg-black disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Register patient and open case'}
      </button>
    </form>
  );
}
