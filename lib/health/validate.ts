// lib/health/validate.ts
// Small input helpers shared by the health-record API routes.
import { COUNTRIES } from '@/lib/countries';

export function formString(form: FormData, key: string, max = 500): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function cleanText(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

const COUNTRY_CODES = new Set<string>(COUNTRIES.map((c) => c.code));

export function validCountry(code: string): string | null {
  const upper = code.toUpperCase();
  return COUNTRY_CODES.has(upper) ? upper : null;
}

/** YYYY-MM-DD, a real date, not in the future, not before 1900. */
export function validDateOfBirth(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null;
  if (value < '1900-01-01' || d.getTime() > Date.now()) return null;
  return value;
}

export function validEmail(value: string): string | null {
  const v = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254 ? v : null;
}

export function validFutureDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value ? null : value;
}
