// app/api/health/export/route.ts
// "Download my records" — the patient's full record as JSON (right of access
// / data portability). Built from the patient's own RLS-scoped reads, so it
// contains exactly what they can see in their account and nothing more.
import { NextResponse } from 'next/server';
import { apiPatientSession } from '@/lib/health/access';
import { logRecordAccess } from '@/lib/health/log';
import { CASE_COLUMNS, loadCaseRecord, PATIENT_COLUMNS } from '@/lib/health/records';

export async function GET() {
  const auth = await apiPatientSession();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth.session;

  const { data: patient } = await supabase.from('patients').select(PATIENT_COLUMNS).eq('profile_id', user.id).maybeSingle();
  if (!patient) return NextResponse.json({ error: 'You don’t have a health record yet' }, { status: 404 });

  const { data: cases } = await supabase
    .from('treatment_cases')
    .select(CASE_COLUMNS)
    .eq('patient_id', patient.id)
    .order('started_at', { ascending: true });

  const records = await Promise.all((cases ?? []).map((c) => loadCaseRecord(supabase, c.id)));

  const exportedAt = new Date().toISOString();
  const document = {
    format: 'globalgetwest-health-record',
    format_version: 1,
    exported_at: exportedAt,
    note: 'Your complete health record as shown in your GLOBALGETWEST account. Times are in UTC. Attachments are listed by name; download them from your account.',
    patient: {
      full_name: patient.full_name,
      date_of_birth: patient.date_of_birth,
      sex: patient.sex,
      phone: patient.phone,
      email: patient.email,
      country_code: patient.country_code,
      consent: {
        given_at: patient.consent_given_at,
        version: patient.consent_version,
        method: patient.consent_method,
      },
    },
    cases: records.filter((r) => r !== null).map((r) => ({
      condition: r.caseRow.condition,
      category: r.categoryName,
      status: r.caseRow.status,
      started_at: r.caseRow.started_at,
      closed_at: r.caseRow.closed_at,
      outcome: r.caseRow.outcome,
      outcome_note: r.caseRow.outcome_note,
      practitioner: r.practitioner
        ? {
            name: r.practitioner.display_name,
            specialty: r.practitioner.specialty,
            licensing_body: r.practitioner.licensing_body,
            license_number: r.practitioner.license_number,
            country_code: r.practitioner.country_code,
          }
        : null,
      timeline: r.entries.map((e) => ({
        id: e.id,
        written_at: e.created_at,
        kind: e.kind,
        author: e.author_name,
        author_role: e.author_role,
        text: e.body,
        feeling: e.feeling,
        order_number: e.order_number,
        corrects_entry_id: e.corrects_entry_id,
        attachments: e.files.map((f) => ({ name: f.file_name, type: f.mime_type, size_bytes: f.size_bytes })),
      })),
    })),
  };

  await logRecordAccess({
    actorId: user.id, actorRole: 'patient', action: 'export', patientId: patient.id,
    detail: { format: 'json', cases: document.cases.length },
  });

  return new NextResponse(JSON.stringify(document, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="globalgetwest-health-record-${exportedAt.slice(0, 10)}.json"`,
      'Cache-Control': 'no-store, private',
    },
  });
}
