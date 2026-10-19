// lib/safeNext.ts
// "?next=" redirect targets must stay on this site. Rejects absolute URLs,
// protocol-relative "//evil.com", backslash tricks and "@host" forms that
// would otherwise turn sign-in links into phishing redirects.
export function safeNextPath(value: string | null | undefined, fallback = '/'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  return value;
}
