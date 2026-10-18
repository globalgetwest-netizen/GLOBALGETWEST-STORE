// app/api/cron/fx-rates/route.ts
// Daily exchange-rate refresh (scheduled in vercel.json). Adds today's
// USD → GHS / NGN rates to fx_rates; checkout always uses the newest row.
//
// Safety:
// - If CRON_SECRET is set in Vercel, only Vercel's scheduler (which sends
//   it as a Bearer token) can run this.
// - At most one update per currency every 12 hours, so repeat calls do
//   nothing.
// - A new rate more than 25% away from the current one is rejected and
//   logged instead of saved — a bad feed can never reprice the store.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServiceRole } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const CURRENCIES = ['GHS', 'NGN'] as const;
const SOURCE_URL = 'https://open.er-api.com/v6/latest/USD';
const MIN_HOURS_BETWEEN_UPDATES = 12;
const MAX_CHANGE = 0.25;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const svc = supabaseServiceRole();
  const now = Date.now();
  const results: Record<string, string> = {};

  // Which currencies actually need an update?
  const due: { code: string; previous: number | null }[] = [];
  for (const code of CURRENCIES) {
    const { data: latest } = await svc
      .from('fx_rates')
      .select('rate, effective_at')
      .eq('base_currency', 'USD')
      .eq('quote_currency', code)
      .order('effective_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const ageHours = latest ? (now - new Date(latest.effective_at).getTime()) / 3_600_000 : Infinity;
    if (ageHours < MIN_HOURS_BETWEEN_UPDATES) {
      results[code] = `skipped — updated ${ageHours.toFixed(1)}h ago`;
    } else {
      due.push({ code, previous: latest ? Number(latest.rate) : null });
    }
  }
  if (due.length === 0) return NextResponse.json({ ok: true, results });

  let rates: Record<string, number>;
  let asOf: string;
  try {
    const res = await fetch(SOURCE_URL, { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    const body = await res.json();
    if (!res.ok || body.result !== 'success' || !body.rates) throw new Error(`Bad response (${res.status})`);
    rates = body.rates;
    asOf = new Date(body.time_last_update_unix * 1000).toISOString().slice(0, 10);
  } catch (err) {
    console.error('FX refresh: rate source unavailable', err);
    return NextResponse.json({ ok: false, error: 'Rate source unavailable', results }, { status: 502 });
  }

  const rows: { base_currency: string; quote_currency: string; rate: number; source: string }[] = [];
  for (const { code, previous } of due) {
    const rate = Number(rates[code]);
    if (!Number.isFinite(rate) || rate <= 0) {
      results[code] = 'rejected — missing from source';
      continue;
    }
    if (previous && Math.abs(rate - previous) / previous > MAX_CHANGE) {
      console.error(`FX refresh: ${code} moved from ${previous} to ${rate} — over ${MAX_CHANGE * 100}%, not saved`);
      results[code] = `rejected — ${previous} → ${rate} is a suspicious jump; check manually`;
      continue;
    }
    rows.push({ base_currency: 'USD', quote_currency: code, rate, source: `open.er-api.com ${asOf} (auto)` });
    results[code] = `updated ${previous ?? '—'} → ${rate}`;
  }

  if (rows.length) {
    const { error } = await svc.from('fx_rates').insert(rows);
    if (error) {
      console.error('FX refresh: insert failed', error);
      return NextResponse.json({ ok: false, error: error.message, results }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true, results });
}
