// components/TikTokIcon.tsx
export function TikTokIcon({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M16.6 5.82c-1.03-.9-1.6-2.17-1.6-3.5h-3.13v13.34c0 1.6-1.3 2.9-2.9 2.9a2.9 2.9 0 0 1 0-5.8c.27 0 .53.04.78.1V9.68a6.03 6.03 0 0 0-.78-.05 6.04 6.04 0 1 0 6.04 6.04V9.4a7.6 7.6 0 0 0 4.42 1.42V7.7c-1.05 0-2.03-.36-2.83-.97-.03-.02-.06-.05-.09-.07l.09.07Z" />
    </svg>
  );
}
