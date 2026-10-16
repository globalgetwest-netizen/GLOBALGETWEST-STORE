'use client';
// components/PrintButton.tsx
// Opens the browser's print dialog, where customers choose "Save as PDF"
// (desktop) or "Save/Share PDF" (phones). No PDF library needed.
export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="focus-ring inline-flex items-center gap-2 bg-[var(--color-charcoal)] text-white font-semibold px-5 py-2.5 rounded hover:bg-black transition-colors"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
      </svg>
      {label}
    </button>
  );
}
