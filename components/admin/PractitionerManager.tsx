'use client';
// components/admin/PractitionerManager.tsx
// Add practitioners, verify licences after checking them with the licensing
// body, and revoke. Only verified practitioners can open patient records.
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface PractitionerListItem {
  id: string;
  display_name: string;
  specialty: string | null;
  license_number: string;
  licensing_body: string;
  country_code: string;
  license_expires_on: string | null;
  verified_at: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  email: string | null;
  is_self: boolean;
  open_cases: number;
}

const input = 'field';

function stateOf(p: PractitionerListItem): { label: string; tone: string } {
  const today = new Date().toISOString().slice(0, 10);
  if (p.revoked_at) return { label: 'Revoked', tone: 'text-[var(--color-danger)]' };
  if (!p.verified_at) return { label: 'Awaiting verification', tone: 'text-[#7A5418]' };
  if (p.license_expires_on && p.license_expires_on < today) return { label: 'Licence expired', tone: 'text-[var(--color-danger)]' };
  return { label: 'Verified', tone: 'text-[#2F5D3A]' };
}

export function PractitionerManager({ initial, countries }: {
  initial: PractitionerListItem[];
  countries: { code: string; name: string }[];
}) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState<string | null>(null);
  const [attested, setAttested] = useState(false);
  const router = useRouter();

  async function call(url: string, method: string, body: unknown, key: string) {
    setBusy(key);
    setError('');
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const ok = await call('/api/admin/practitioners', 'POST', Object.fromEntries(f.entries()), 'add');
    if (ok) setAdding(false);
  }

  async function verify(id: string) {
    const ok = await call(`/api/admin/practitioners/${id}`, 'PATCH', { action: 'verify', attested }, id);
    if (ok) { setVerifying(null); setAttested(false); }
  }

  async function revoke(id: string, name: string) {
    const reason = prompt(`Revoke ${name}? They will immediately lose access to every patient record.\n\nReason (kept on record):`);
    if (!reason?.trim()) return;
    await call(`/api/admin/practitioners/${id}`, 'PATCH', { action: 'revoke', reason }, id);
  }

  return (
    <div>
      {error && <p className="text-sm text-[var(--color-danger)] mb-4">{error}</p>}

      {adding ? (
        <form onSubmit={add} className="border border-[var(--color-border)] rounded-lg bg-white p-5 mb-8 grid sm:grid-cols-2 gap-4 max-w-3xl">
          <div className="sm:col-span-2">
            <h2 className="font-display text-xl">Add a practitioner</h2>
            <p className="text-xs text-[var(--color-ink-soft)] mt-1">They must already have an account (normal sign-up). Adding them gives no access until you verify the licence.</p>
          </div>
          <div>
            <label htmlFor="pm-email" className="field-label">Account email</label>
            <input id="pm-email" name="email" type="email" required className={input} />
          </div>
          <div>
            <label htmlFor="pm-name" className="field-label">Name shown to patients</label>
            <input id="pm-name" name="displayName" required maxLength={120} placeholder="Dr Ama Mensah" className={input} />
          </div>
          <div>
            <label htmlFor="pm-specialty" className="field-label">Specialty <span className="font-normal text-[var(--color-ink-muted)]">(optional)</span></label>
            <input id="pm-specialty" name="specialty" maxLength={120} placeholder="Medical herbalist" className={input} />
          </div>
          <div>
            <label htmlFor="pm-licence" className="field-label">Licence / registration number</label>
            <input id="pm-licence" name="licenseNumber" required maxLength={80} className={input} />
          </div>
          <div>
            <label htmlFor="pm-body" className="field-label">Licensing body</label>
            <input id="pm-body" name="licensingBody" required maxLength={160} placeholder="e.g. Traditional Medicine Practice Council (Ghana)" className={input} />
          </div>
          <div>
            <label htmlFor="pm-country" className="field-label">Issuing country</label>
            <select id="pm-country" name="countryCode" required className={input} defaultValue="">
              <option value="">Choose…</option>
              {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="pm-expires" className="field-label">Licence expires <span className="font-normal text-[var(--color-ink-muted)]">(if stated)</span></label>
            <input id="pm-expires" name="licenseExpiresOn" type="date" className={input} />
          </div>
          <div className="sm:col-span-2 flex gap-3">
            <button type="submit" disabled={busy === 'add'} className="focus-ring bg-[var(--color-forest)] text-[var(--color-parchment)] font-semibold px-4 py-2 rounded-md hover:bg-[var(--color-forest-dark)] disabled:opacity-60">
              {busy === 'add' ? 'Adding…' : 'Add practitioner'}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="focus-ring text-sm text-[var(--color-ink-soft)] hover:underline">Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="focus-ring mb-8 bg-[var(--color-forest)] text-[var(--color-parchment)] font-semibold px-4 py-2 rounded-md hover:bg-[var(--color-forest-dark)]">
          Add a practitioner
        </button>
      )}

      {initial.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-soft)]">No practitioners yet.</p>
      ) : (
        <div className="space-y-3">
          {initial.map((p) => {
            const state = stateOf(p);
            return (
              <div key={p.id} className="border border-[var(--color-border)] rounded-lg bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{p.display_name}{p.specialty && <span className="font-normal text-[var(--color-ink-soft)]"> · {p.specialty}</span>}</p>
                    <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">
                      {p.email ?? 'no email'} · Licence <strong>{p.license_number}</strong> · {p.licensing_body} ({p.country_code})
                      {p.license_expires_on && <> · expires {p.license_expires_on}</>}
                    </p>
                    <p className="text-xs mt-1">
                      <span className={`font-semibold ${state.tone}`}>{state.label}</span>
                      {p.verified_at && !p.revoked_at && <span className="text-[var(--color-ink-muted)]"> · since {p.verified_at.slice(0, 10)}</span>}
                      {p.revoked_reason && <span className="text-[var(--color-ink-muted)]"> · {p.revoked_reason}</span>}
                      <span className="text-[var(--color-ink-muted)]"> · {p.open_cases} open case{p.open_cases === 1 ? '' : 's'}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {(!p.verified_at || p.revoked_at) && !p.is_self && verifying !== p.id && (
                      <button type="button" onClick={() => { setVerifying(p.id); setAttested(false); }} className="focus-ring text-xs font-medium border border-[var(--color-forest)] text-[var(--color-forest)] rounded px-3 py-1.5 hover:bg-[var(--color-parchment-warm)]">
                        {p.revoked_at ? 'Reinstate…' : 'Verify licence…'}
                      </button>
                    )}
                    {p.verified_at && !p.revoked_at && (
                      <button type="button" disabled={busy === p.id} onClick={() => revoke(p.id, p.display_name)} className="focus-ring text-xs font-medium border border-[var(--color-border)] text-[var(--color-danger)] rounded px-3 py-1.5 hover:bg-[var(--color-parchment-warm)] disabled:opacity-60">
                        Revoke
                      </button>
                    )}
                  </div>
                </div>

                {verifying === p.id && (
                  <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                    <label className="flex items-start gap-3 text-sm cursor-pointer">
                      <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-forest)]" />
                      <span>
                        I checked licence <strong>{p.license_number}</strong> with <strong>{p.licensing_body}</strong> (register, website
                        or letter) and it is current and belongs to {p.display_name}.
                      </span>
                    </label>
                    <div className="flex gap-2 mt-3">
                      <button type="button" disabled={!attested || busy === p.id} onClick={() => verify(p.id)} className="focus-ring text-xs font-semibold bg-[var(--color-forest)] text-white rounded px-3 py-1.5 hover:bg-[var(--color-forest-dark)] disabled:opacity-50">
                        {busy === p.id ? 'Saving…' : 'Mark as verified'}
                      </button>
                      <button type="button" onClick={() => setVerifying(null)} className="focus-ring text-xs text-[var(--color-ink-soft)] hover:underline">Cancel</button>
                    </div>
                  </div>
                )}
                {p.is_self && !p.verified_at && (
                  <p className="text-xs text-[var(--color-ink-muted)] mt-2">Another administrator must verify your own licence.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
