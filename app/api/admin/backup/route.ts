// app/api/admin/backup/route.ts
// Full data backup as one JSON file — the free-plan replacement for
// Supabase's paid daily backups. CEO only, with two-step sign-in, and every
// download is written to the records access log (it includes patient
// records). Uses the site's existing server connection: no extra keys.
//
// Not included: uploaded files (product images, patient photos/PDFs live in
// Supabase Storage) and sign-in passwords (managed by Supabase Auth).
import { NextResponse } from 'next/server';
import { supabaseServiceRole } from '@/lib/supabase/server';
import { apiRecordsAdminSession } from '@/lib/health/access';
import { logRecordAccess } from '@/lib/health/log';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Order matters for a restore: parents before children.
const TABLES = [
  'currencies', 'fx_rates',
  'categories', 'products', 'product_variants', 'product_images', 'inventory_movements',
  'homepage_banner', 'homepage_banners', 'newsletter_subscribers',
  'profiles', 'addresses',
  'orders', 'order_items', 'order_events', 'payments', 'reviews',
  'practitioners', 'patients', 'treatment_cases', 'case_entries', 'case_entry_files', 'record_access_log',
] as const;

const PAGE = 1000;

export async function GET() {
  const auth = await apiRecordsAdminSession({ ceoOnly: true });
  if (!auth.ok) return auth.response;
  const { user } = auth.session;

  const svc = supabaseServiceRole();
  const tables: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};
  const skipped: string[] = [];

  for (const table of TABLES) {
    const rows: unknown[] = [];
    let failed = false;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await svc.from(table).select('*').range(from, from + PAGE - 1);
      if (error) {
        failed = true;
        break;
      }
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
    }
    if (failed) {
      skipped.push(table);
      continue;
    }
    tables[table] = rows;
    counts[table] = rows.length;
  }

  // Log before handing over the file (fails closed, like every records read).
  await logRecordAccess({
    actorId: user.id, actorRole: 'ceo', action: 'export',
    detail: { kind: 'full_backup', tables: Object.keys(tables).length, skipped: skipped.length },
  });

  const createdAt = new Date().toISOString();
  const body = JSON.stringify({
    backup: 'GLOBALGETWEST full data backup',
    created_at: createdAt,
    created_by: user.id,
    note: 'Contains customer and patient health data. Store it encrypted and never share it.',
    counts,
    skipped,
    tables,
  });

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="globalgetwest-backup-${createdAt.slice(0, 10)}.json"`,
      'Cache-Control': 'no-store, private',
    },
  });
}
