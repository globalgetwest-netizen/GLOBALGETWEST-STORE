// app/admin/backup/page.tsx
// CEO-only: download a full copy of the store's data (including patient
// records) as one JSON file. Free alternative to Supabase's paid backups.
import { redirect } from 'next/navigation';
import { requireRecordsAdminSession } from '@/lib/health/access';
import { MfaRequired } from '@/components/health/MfaRequired';

export default async function BackupPage() {
  const session = await requireRecordsAdminSession();
  if (!session.isCeo) redirect('/admin');
  if (!session.mfaVerified) return <MfaRequired hasFactor={session.hasMfaFactor} next="/admin/backup" audience="admin" />;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl mb-2">Data Backup</h1>
      <p className="text-[var(--color-ink-soft)] text-sm mb-8">
        Download a complete copy of your store&apos;s data: products, customers, orders, payments and patient
        records. Only the CEO account can do this, and every download is recorded in the records access log.
      </p>

      <div className="border border-[var(--color-border)] rounded-lg bg-white p-6 mb-6">
        <a
          href="/api/admin/backup"
          className="focus-ring inline-block bg-[var(--color-charcoal)] text-white font-semibold px-6 py-3 rounded hover:bg-black transition-colors"
        >
          Download full backup
        </a>
        <p className="mt-3 text-xs text-[var(--color-ink-soft)]">
          One <span className="font-medium">.json</span> file, named with today&apos;s date. It may take a few seconds.
        </p>
      </div>

      <h2 className="font-display text-xl mb-3">Keeping it safe</h2>
      <ul className="space-y-2 text-sm text-[var(--color-ink-soft)] list-disc pl-5 mb-8">
        <li><strong className="text-[var(--color-ink)]">Download once a week</strong>, and after any busy day.</li>
        <li>
          The file contains customers&apos; and patients&apos; personal health data. Keep it on an
          encrypted drive or in a password-protected folder (for example a password-protected ZIP),
          never in email, WhatsApp or a shared folder.
        </li>
        <li>Keep the last few copies and delete older ones securely.</li>
      </ul>

      <h2 className="font-display text-xl mb-3">What&apos;s not included</h2>
      <ul className="space-y-2 text-sm text-[var(--color-ink-soft)] list-disc pl-5">
        <li>Uploaded files: product images and patient photos or PDFs (they stay in Supabase Storage).</li>
        <li>Sign-in passwords, which Supabase keeps separately and never exposes.</li>
      </ul>
    </div>
  );
}
