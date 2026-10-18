// components/health/StatusBadge.tsx
import { OUTCOME_LABELS, STATUS_LABELS, type CaseOutcome, type CaseStatus } from '@/lib/health/labels';

const TONE: Record<CaseStatus, string> = {
  intake: 'bg-[var(--color-parchment-warm)] text-[var(--color-ink-soft)] border-[var(--color-border)]',
  active: 'bg-[#EEF2F7] text-[var(--color-forest)] border-[#D5DEEA]',
  improving: 'bg-[#EEF5EF] text-[#2F5D3A] border-[#D3E5D7]',
  resolved: 'bg-[var(--color-forest)] text-white border-[var(--color-forest)]',
  discontinued: 'bg-white text-[var(--color-ink-soft)] border-[var(--color-border)]',
  referred: 'bg-[#F7F1E6] text-[#7A5418] border-[#EADBBE]',
};

export function StatusBadge({ status, outcome }: { status: CaseStatus; outcome?: CaseOutcome | null }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full border px-2.5 py-0.5 whitespace-nowrap ${TONE[status]}`}>
      {STATUS_LABELS[status]}
      {outcome && status === 'discontinued' && <span className="font-normal">· {OUTCOME_LABELS[outcome]}</span>}
    </span>
  );
}
