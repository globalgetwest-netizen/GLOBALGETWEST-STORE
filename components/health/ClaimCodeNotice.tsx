'use client';
// components/health/ClaimCodeNotice.tsx
// Shows a freshly issued record code once. It is not stored in readable form
// anywhere, so if it's lost a new one has to be issued.
import { CopyButton } from '@/components/CopyButton';
import { formatRecordDate } from '@/lib/health/labels';

export function ClaimCodeNotice({ code, expiresAt }: { code: string; expiresAt: string }) {
  return (
    <div className="border border-[var(--color-forest)] rounded-lg bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-ochre)] mb-2">Record code — shown once</p>
      <div className="flex flex-wrap items-center gap-3">
        <code className="text-2xl font-mono font-semibold tracking-[0.2em]">{code}</code>
        <CopyButton value={code} />
      </div>
      <p className="text-sm text-[var(--color-ink-soft)] mt-3 leading-relaxed">
        Give this code to the patient. They create an account (or sign in), open <strong>My health records</strong> and
        choose “I have a code from my practitioner”. It works once and expires on {formatRecordDate(expiresAt)}.
        It can’t be shown again — if it’s lost, issue a new one from the case page.
      </p>
    </div>
  );
}
