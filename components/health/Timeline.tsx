// components/health/Timeline.tsx
// The case timeline, oldest first — first consultation at the top, latest
// entry at the bottom. Shared by the patient, practitioner and admin views.
// Entries are never edited: a corrected entry stays in place, marked, and
// the correction appears where it was written.
import Link from 'next/link';
import type { TimelineEntry } from '@/lib/health/records';
import {
  ENTRY_KIND_LABELS, FEELING_LABELS, formatRecordDate, formatRecordDateTime,
  isOneOf, OUTCOME_LABELS, CASE_OUTCOMES, STATUS_LABELS, CASE_STATUSES,
} from '@/lib/health/labels';
import { CorrectEntryButton } from '@/components/health/CorrectEntryButton';

type Viewer = 'patient' | 'practitioner' | 'admin';

const KIND_TONE: Record<string, string> = {
  intake: 'bg-[#EEF2F7] text-[var(--color-forest)]',
  assessment: 'bg-[#EEF2F7] text-[var(--color-forest)]',
  plan: 'bg-[#EEF2F7] text-[var(--color-forest)]',
  product_dispensed: 'bg-[#F7F1E6] text-[#7A5418]',
  check_in: 'bg-[#EEF5EF] text-[#2F5D3A]',
  lab_result: 'bg-[#F2EEF7] text-[#4B3A73]',
  note: 'bg-[var(--color-parchment-warm)] text-[var(--color-ink-soft)]',
  outcome: 'bg-[var(--color-forest)] text-white',
  correction: 'bg-[#FBEDEC] text-[var(--color-danger)]',
};

function statusLabel(value: string | null | undefined): string {
  return value && isOneOf(CASE_STATUSES, value) ? STATUS_LABELS[value] : value ?? '';
}

function eventSentence(e: TimelineEntry): string {
  const m = e.eventMeta ?? {};
  switch (e.event) {
    case 'status_changed': return `Status changed from ${statusLabel(m.from)} to ${statusLabel(m.to)}`;
    case 'case_reopened': return 'Case reopened';
    case 'assigned': return e.body.replace(/\.$/, '');
    case 'condition_changed': return e.body.replace(/\.$/, '');
    default: return e.body;
  }
}

export function Timeline({
  entries, viewer, correctEndpoint, canCorrect,
}: {
  entries: TimelineEntry[];
  viewer: Viewer;
  /** API route that accepts a correction (FormData with correctsEntryId + body). */
  correctEndpoint?: string;
  canCorrect?: (entry: TimelineEntry) => boolean;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-[var(--color-ink-soft)]">Nothing has been written in this case yet.</p>;
  }

  const byId = new Map(entries.map((e) => [e.id, e]));
  const correctionsOf = new Map<string, TimelineEntry[]>();
  for (const e of entries) {
    if (e.corrects_entry_id) correctionsOf.set(e.corrects_entry_id, [...(correctionsOf.get(e.corrects_entry_id) ?? []), e]);
  }

  return (
    <ol className="relative border-l border-[var(--color-border)] ml-2 space-y-5">
      {entries.map((e) => {
        // Status changes, assignment, reopening: a compact line, not a card.
        if (e.event && e.kind !== 'outcome') {
          return (
            <li key={e.id} id={`entry-${e.id}`} className="relative ml-5 scroll-mt-24">
              <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--color-border)] ring-4 ring-white" aria-hidden="true" />
              <p className="text-sm text-[var(--color-ink-soft)]">
                {eventSentence(e)}
                <span className="text-[var(--color-ink-muted)]"> · {formatRecordDateTime(e.created_at)}</span>
              </p>
            </li>
          );
        }

        const corrected = correctionsOf.get(e.id);
        const original = e.corrects_entry_id ? byId.get(e.corrects_entry_id) : undefined;
        const outcome = e.kind === 'outcome' && e.eventMeta?.outcome && isOneOf(CASE_OUTCOMES, e.eventMeta.outcome)
          ? OUTCOME_LABELS[e.eventMeta.outcome] : null;

        return (
          <li key={e.id} id={`entry-${e.id}`} className="relative ml-5 scroll-mt-24">
            <span
              className={`absolute -left-[26.5px] top-4 h-3 w-3 rounded-full ring-4 ring-white ${e.kind === 'outcome' ? 'bg-[var(--color-forest)]' : e.author_role === 'patient' ? 'bg-[#6E9B78]' : 'bg-[var(--color-ochre)]'}`}
              aria-hidden="true"
            />
            <article className={`border rounded-lg p-4 bg-white ${e.kind === 'outcome' ? 'border-[var(--color-forest)]' : 'border-[var(--color-border)]'} ${corrected ? 'opacity-80' : ''}`}>
              <header className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                <span className={`text-[11px] font-semibold uppercase tracking-wide rounded px-2 py-0.5 ${KIND_TONE[e.kind] ?? KIND_TONE.note}`}>
                  {outcome ? `Outcome · ${outcome}` : ENTRY_KIND_LABELS[e.kind]}
                </span>
                {e.feeling && (
                  <span className="text-[11px] font-medium rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[var(--color-ink-soft)]">
                    Feeling: {FEELING_LABELS[e.feeling]}
                  </span>
                )}
                {viewer !== 'patient' && !e.visible_to_patient && (
                  <span className="text-[11px] font-medium rounded-full bg-[var(--color-parchment-warm)] border border-[var(--color-border)] px-2 py-0.5 text-[var(--color-ink-soft)]">
                    Private — not shown to patient
                  </span>
                )}
                {corrected && (
                  <a href={`#entry-${corrected[corrected.length - 1].id}`} className="focus-ring text-[11px] font-medium text-[var(--color-danger)] hover:underline">
                    Corrected on {formatRecordDate(corrected[corrected.length - 1].created_at)} ↓
                  </a>
                )}
              </header>

              {original && (
                <p className="text-xs text-[var(--color-ink-soft)] mb-2">
                  Corrects the {ENTRY_KIND_LABELS[original.kind].toLowerCase()} written{' '}
                  <a href={`#entry-${original.id}`} className="focus-ring underline">{formatRecordDateTime(original.created_at)}</a>
                </p>
              )}

              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{e.body}</p>

              {e.order_number && (
                <p className="text-xs mt-2 text-[var(--color-ink-soft)]">
                  Linked order:{' '}
                  {viewer === 'patient' && e.order_id ? (
                    <Link href={`/orders/${e.order_id}/success`} className="focus-ring font-medium text-[var(--color-forest)] hover:underline">{e.order_number}</Link>
                  ) : viewer === 'admin' && e.order_id ? (
                    <Link href={`/admin/orders/${e.order_id}`} className="focus-ring font-medium text-[var(--color-forest)] hover:underline">{e.order_number}</Link>
                  ) : (
                    <span className="font-medium">{e.order_number}</span>
                  )}
                </p>
              )}

              {e.files.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {e.files.map((f) => (
                    <li key={f.id}>
                      <a
                        href={`/api/health/files/${f.id}`} target="_blank" rel="noopener noreferrer"
                        className="focus-ring inline-flex items-center gap-1.5 text-xs font-medium border border-[var(--color-border)] rounded px-2.5 py-1.5 hover:bg-[var(--color-parchment-warm)]"
                      >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                        </svg>
                        {f.file_name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-ink-muted)]">
                <span>
                  {e.author_name}
                  {e.author_role === 'practitioner' && ' · Practitioner'}
                  {e.author_role === 'patient' && ' · Patient'}
                  {' · '}{formatRecordDateTime(e.created_at)}
                </span>
                {correctEndpoint && canCorrect?.(e) && (
                  <CorrectEntryButton endpoint={correctEndpoint} entryId={e.id} />
                )}
              </footer>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
