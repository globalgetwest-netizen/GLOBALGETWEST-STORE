// components/ProductText.tsx
// Renders product copy typed in the admin (description, ingredients, how to
// use, warnings) cleanly: lines starting with "*", "-" or "•" become a real
// bulleted list, a short lead-in such as "Doctor First:" is shown in bold,
// and stray trailing commas/semicolons are dropped. The stored text is never
// changed — only how it is displayed.
type Block = { kind: 'p'; text: string } | { kind: 'ul'; items: string[] };

const BULLET = /^\s*[*\-•–]\s+/;

function toBlocks(raw: string): Block[] {
  const blocks: Block[] = [];
  for (const line of raw.replace(/\r\n?/g, '\n').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (BULLET.test(trimmed)) {
      const item = trimmed.replace(BULLET, '');
      const last = blocks[blocks.length - 1];
      if (last?.kind === 'ul') last.items.push(item);
      else blocks.push({ kind: 'ul', items: [item] });
    } else {
      blocks.push({ kind: 'p', text: trimmed });
    }
  }
  return blocks;
}

function tidy(text: string): string {
  return text.replace(/[\s,;]+$/, '');
}

/** "Doctor First: Consult …" → <strong>Doctor First:</strong> Consult … */
function withLeadIn(text: string) {
  const m = tidy(text).match(/^([^:]{2,40}):\s+(.+)$/);
  if (!m) return tidy(text);
  return <><strong className="font-semibold text-[var(--color-ink)]">{m[1]}:</strong> {m[2]}</>;
}

export function ProductText({ text, className = '' }: { text: string; className?: string }) {
  const blocks = toBlocks(text);
  return (
    <div className={`space-y-2 text-[var(--color-ink-soft)] leading-relaxed ${className}`}>
      {blocks.map((b, i) =>
        b.kind === 'p' ? (
          <p key={i}>{tidy(b.text)}</p>
        ) : (
          <ul key={i} className="space-y-1.5 pl-1">
            {b.items.map((item, j) => (
              <li key={j} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-ochre)]" />
                <span>{withLeadIn(item)}</span>
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
