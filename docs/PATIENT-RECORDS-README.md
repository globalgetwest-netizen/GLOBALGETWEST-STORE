# Patient treatment records

Each patient has a record. Each condition they are treated for is a **case**. Every case has a **timeline** that runs from the first consultation to the final outcome. A **licensed practitioner** writes and signs the clinical entries. The patient reads their own record (read-only) and adds their own check-ins.

> Not live yet. This branch (`feat/patient-records`) has not been merged, and migration 017 has **not** been applied to the live Supabase project. Both need the owner's go-ahead (see the end of this file).

## Who sees what (enforced in the database by RLS, not only in the app)

| Who | What they can do |
|---|---|
| Patient (signed in, not a guest session) | Read their own cases and every entry marked visible. Add check-ins (how they feel, symptoms, photos). Correct their own check-ins. Request a consultation. Download their record. |
| Verified practitioner, **with two-step sign-in** | Only cases assigned to them. Register patients they consulted (consent recorded). Add entries, set status, close a case with an outcome, reopen, link the patient's own orders. |
| Admin / CEO, **with two-step sign-in** | See all cases, assign them to practitioners, add/verify/revoke practitioner licences, read the access log. They cannot write clinical entries. Only the CEO can erase a record. |
| Staff, agents, everyone else | Nothing. |

- **Append-only:** nobody can edit or delete a timeline entry, not even with the service role. Mistakes are fixed by adding a `correction` entry, and the original stays visible and marked. Status changes, assignments, closures and reopenings are written to the timeline by the database itself.
- **Honest outcomes:** a case can only be closed with an outcome (resolved, improved, no change, worsened, referred to hospital, lost to follow-up) plus a note saying what actually happened. A closed outcome can't be rewritten; the case has to be reopened, and the reopening is recorded. There is no testimonial or "cure claim" feature, and records are never public.
- **Access log:** every page and API route that reads or changes a record writes a row to `record_access_log` (who, what, which record, when; never the contents). If the log can't be written, the read or change does not happen.
- **Files:** stored in the private `patient-files` bucket, which has no storage policies. Files are only opened through `/api/health/files/[id]`: RLS is checked first, then a 60-second signed URL is issued. Uploads are checked by their actual file bytes (JPG/PNG/WEBP/HEIC/PDF, max 4 files and 4 MB per entry). Photos are downscaled in the browser before upload.
- **Practitioner licences:** an admin adds the licence (number, licensing body, country, optional expiry). A **different** admin verifies it after checking with the licensing body; nobody can verify their own. An expired or revoked licence means no access straight away. Past entries stay under the practitioner's name.
- **Walk-in / WhatsApp patients:** the practitioner registers them and confirms consent. The practitioner then receives a one-time **record code** (stored only as a hash, valid 30 days). The patient signs up and enters the code to link the record. If an email was recorded, they must also sign in with that same confirmed email.

## Pages

- `/account/health`: the consent notice on first visit (or "I have a code"), then the patient's cases, a consultation request form, JSON download and a printable/PDF copy (`/account/health/print`).
- `/account/health/cases/[id]`: the timeline plus the check-in form.
- `/account/security`: two-step sign-in (authenticator app, via Supabase Auth MFA). Practitioners and admins need it.
- `/practitioner`: caseload, `/practitioner/patients/new`, `/practitioner/cases/[id]`.
- `/admin/practitioners`, `/admin/patient-cases`, `/admin/patient-cases/[id]` (read-only timeline, assignment, access log, CEO erasure).

## Owner go-ahead needed

1. **Apply migration 017** to the live Supabase project (`ybykqolfcgwmewyxwjoy`): paste `supabase/migrations/017_patient_records.sql` into the SQL Editor and run it **in one go**. Unlike migration 006, it does not need two steps. It only adds new things (a new role value, new tables, functions, policies and a private bucket) and does not change any existing table or policy.
2. **Check Supabase Auth settings:** "Confirm email" should be on (the record-code flow relies on confirmed emails). TOTP MFA is enabled by default; confirm it's on under Authentication → Multi-Factor.
3. **Review the consent wording** in `lib/health/consent.ts` (ideally with a data-protection adviser). The retention wording is deliberately general ("until you ask us to delete it, unless a law requires us to keep part of it"), because the business's legal retention period isn't recorded anywhere. Set a specific period if you have one, and bump `CONSENT_VERSION` if the substance changes.
4. **Merge** `feat/patient-records` into `phase-5-staff-portal`. Merging deploys it to www.globalgetwest.com. Apply migration 017 **before** merging, or the new pages will error.
5. After going live: an admin turns on two-step sign-in at `/account/security`, adds the first practitioner at `/admin/practitioners`, and a **second** admin (or the CEO) verifies the licence.

## Testing

`supabase/tests/run_017_tests.sh` builds a **throwaway local** Postgres from `schema.sql` plus every migration (with a minimal Supabase stand-in), then runs 98 security checks as patients, practitioners (with and without MFA, unverified, revoked), staff, admin and CEO. Last run: 98 passed, 0 failed. Never point it at the live project.
