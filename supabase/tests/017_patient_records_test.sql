-- RLS / trigger tests for migration 017. Run on a THROWAWAY local database only (see run_017_tests.sh).
-- Security tests for migration 017. Run as postgres; switches role/claims per test.
\set ON_ERROR_STOP 1
set client_min_messages = notice;

create table if not exists public._results (n serial, label text, ok boolean, info text);
grant all on public._results to authenticated, service_role;
grant all on sequence public._results_n_seq to authenticated, service_role;

create or replace function public._as(p_user text, p_aal text default 'aal1', p_anon boolean default false) returns void as $$
begin
  perform set_config('request.jwt.claims',
    case when p_user is null then '{}' else
      json_build_object('sub', p_user, 'aal', p_aal, 'role', 'authenticated', 'is_anonymous', p_anon)::text end,
    false);
end; $$ language plpgsql;

create or replace function public._count(p_sql text, p_expect int, p_label text) returns void as $$
declare n int;
begin
  execute 'select count(*) from (' || p_sql || ') q' into n;
  insert into public._results(label, ok, info) values (p_label, n = p_expect, 'got ' || n || ' expected ' || p_expect);
exception when others then
  insert into public._results(label, ok, info) values (p_label, false, 'error: ' || sqlerrm);
end; $$ language plpgsql;

create or replace function public._fails(p_sql text, p_label text) returns void as $$
declare rc int;
begin
  execute p_sql;
  get diagnostics rc = row_count;
  -- An UPDATE/DELETE silently filtered by RLS (0 rows) also counts as blocked.
  insert into public._results(label, ok, info) values (p_label, rc = 0, 'succeeded, rows=' || rc);
exception when others then
  insert into public._results(label, ok, info) values (p_label, true, sqlerrm);
end; $$ language plpgsql;

create or replace function public._works(p_sql text, p_label text) returns void as $$
begin
  execute p_sql;
  insert into public._results(label, ok, info) values (p_label, true, 'ok');
exception when others then
  insert into public._results(label, ok, info) values (p_label, false, 'error: ' || sqlerrm);
end; $$ language plpgsql;

-- ---------------------------------------------------------------- fixtures
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'ceo@x.com'),
  ('00000000-0000-0000-0000-0000000000a1', 'admin@x.com'),
  ('00000000-0000-0000-0000-0000000000e1', 'staff@x.com'),
  ('00000000-0000-0000-0000-0000000000d1', 'drA@x.com'),
  ('00000000-0000-0000-0000-0000000000d2', 'drB@x.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'pat1@x.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'pat2@x.com'),
  ('00000000-0000-0000-0000-0000000000b3', 'walkin@x.com');
update profiles set role = 'ceo' where id = '00000000-0000-0000-0000-0000000000c1';
update profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000a1';
update profiles set role = 'staff' where id = '00000000-0000-0000-0000-0000000000e1';

insert into orders (id, order_number, customer_id, currency, subtotal_usd_cents, total_usd_cents) values
  ('00000000-0000-0000-0000-00000000f001', 'GGW-1', '00000000-0000-0000-0000-0000000000b1', 'USD', 100, 100),
  ('00000000-0000-0000-0000-00000000f002', 'GGW-2', '00000000-0000-0000-0000-0000000000b2', 'USD', 100, 100);

set role authenticated;

-- ---------------------------------------------------------------- practitioners
select _as('00000000-0000-0000-0000-0000000000a1', 'aal1');
select _fails($$insert into practitioners (profile_id, display_name, license_number, licensing_body, country_code) values ('00000000-0000-0000-0000-0000000000d1','Dr A','L1','TMPC','GH')$$, 'admin without MFA cannot add practitioner');
select _count('select * from practitioners', 0, 'admin without MFA sees no practitioners');

select _as('00000000-0000-0000-0000-0000000000a1', 'aal2');
select _works($$insert into practitioners (id, profile_id, display_name, license_number, licensing_body, country_code) values ('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-0000000000d1','Dr A','L1','TMPC','GH')$$, 'admin with MFA adds practitioner A');
select _works($$insert into practitioners (id, profile_id, display_name, license_number, licensing_body, country_code) values ('00000000-0000-0000-0000-0000000000bb','00000000-0000-0000-0000-0000000000d2','Dr B','L2','TMPC','GH')$$, 'admin with MFA adds practitioner B (unverified)');
select _fails($$insert into practitioners (profile_id, display_name, license_number, licensing_body, country_code, verified_at) values ('00000000-0000-0000-0000-0000000000e1','Dr S','L3','TMPC','GH', now())$$, 'cannot insert an already-verified practitioner');
select _works($$update practitioners set verified_at = now() where id = '00000000-0000-0000-0000-0000000000aa'$$, 'admin verifies A');
select _count($$select * from practitioners where id = '00000000-0000-0000-0000-0000000000aa' and verified_by = '00000000-0000-0000-0000-0000000000a1'$$, 1, 'verified_by stamped with the verifying admin');
reset role;
select _count($$select * from profiles where id = '00000000-0000-0000-0000-0000000000d1' and role::text = 'practitioner'$$, 1, 'A profile role became practitioner');
set role authenticated;

select _as('00000000-0000-0000-0000-0000000000d1', 'aal2');
select _fails($$update practitioners set license_number = 'X' where id = '00000000-0000-0000-0000-0000000000aa'$$, 'practitioner cannot edit own licence row');
select _fails($$update practitioners set verified_at = now() where id = '00000000-0000-0000-0000-0000000000bb'$$, 'practitioner cannot verify another practitioner');
select _count('select * from practitioners', 1, 'practitioner sees only own practitioner row');

-- ---------------------------------------------------------------- practitioner-registered patient
select _as('00000000-0000-0000-0000-0000000000d1', 'aal1');
select _fails($$insert into patients (full_name, consent_given_at, consent_version, consent_method, consent_recorded_by, created_by_practitioner_id) values ('W', now(), 'v1', 'recorded_by_practitioner', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000aa')$$, 'practitioner without MFA cannot register patient');
select _count('select * from treatment_cases', 0, 'practitioner without MFA sees no cases');

select _as('00000000-0000-0000-0000-0000000000d2', 'aal2');
select _fails($$insert into patients (full_name, consent_given_at, consent_version, consent_method, consent_recorded_by, created_by_practitioner_id) values ('W', now(), 'v1', 'recorded_by_practitioner', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000bb')$$, 'unverified practitioner cannot register patient');

select _as('00000000-0000-0000-0000-0000000000d1', 'aal2');
select _fails($$insert into patients (full_name, consent_version, consent_method, consent_recorded_by, created_by_practitioner_id) values ('W', 'v1', 'recorded_by_practitioner', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000aa')$$, 'no patient record without consent timestamp');
select _works($$insert into patients (id, full_name, email, consent_given_at, consent_version, consent_method, consent_recorded_by, created_by_practitioner_id) values ('00000000-0000-0000-0000-0000000000f3', 'Walk In', 'walkin@x.com', now(), 'v1', 'recorded_by_practitioner', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000aa')$$, 'verified practitioner with MFA registers walk-in patient');
select _works($$insert into treatment_cases (id, patient_id, condition, practitioner_id, status) values ('00000000-0000-0000-0000-0000000c0003', '00000000-0000-0000-0000-0000000000f3', 'Hypertension', '00000000-0000-0000-0000-0000000000aa', 'active')$$, 'practitioner opens case for own patient');
select _works($$insert into case_entries (case_id, kind, body, author_id, author_role) values ('00000000-0000-0000-0000-0000000c0003', 'intake', 'BP 160/100', '00000000-0000-0000-0000-0000000000d1', 'practitioner')$$, 'practitioner writes intake entry');

-- ---------------------------------------------------------------- patient self-registration
select _as('00000000-0000-0000-0000-0000000000b1', 'aal1', true);
select _fails($$insert into patients (profile_id, full_name, consent_given_at, consent_version, consent_method) values ('00000000-0000-0000-0000-0000000000b1', 'P1', now(), 'v1', 'self_online')$$, 'anonymous (guest) session cannot create a patient record');

select _as('00000000-0000-0000-0000-0000000000b1', 'aal1');
select _fails($$insert into patients (profile_id, full_name, consent_given_at, consent_version, consent_method) values ('00000000-0000-0000-0000-0000000000b2', 'P2', now(), 'v1', 'self_online')$$, 'patient cannot create a record for another account');
select _works($$insert into patients (id, profile_id, full_name, email, consent_given_at, consent_version, consent_method) values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b1', 'Pat One', 'pat1@x.com', now(), 'v1', 'self_online')$$, 'patient consents and creates own record');
select _works($$insert into treatment_cases (id, patient_id, condition, status) values ('00000000-0000-0000-0000-0000000c0001', '00000000-0000-0000-0000-0000000000f1', 'Hepatitis B', 'intake')$$, 'patient requests a consultation (unassigned case)');
select _fails($$insert into treatment_cases (patient_id, condition, status, practitioner_id) values ('00000000-0000-0000-0000-0000000000f1', 'X', 'intake', '00000000-0000-0000-0000-0000000000aa')$$, 'patient cannot pick a practitioner for their case');
select _works($$insert into case_entries (case_id, kind, body, author_id, author_role) values ('00000000-0000-0000-0000-0000000c0001', 'intake', 'Tired for 3 months', '00000000-0000-0000-0000-0000000000b1', 'patient')$$, 'patient writes first intake entry');
select _fails($$insert into case_entries (case_id, kind, body, author_id, author_role) values ('00000000-0000-0000-0000-0000000c0001', 'intake', 'again', '00000000-0000-0000-0000-0000000000b1', 'patient')$$, 'patient cannot write a second intake entry');
select _fails($$insert into case_entries (case_id, kind, body, author_id, author_role) values ('00000000-0000-0000-0000-0000000c0001', 'assessment', 'self-diagnosis', '00000000-0000-0000-0000-0000000000b1', 'patient')$$, 'patient cannot write clinical entry kinds');
select _fails($$insert into case_entries (case_id, kind, body, author_id, author_role) values ('00000000-0000-0000-0000-0000000c0001', 'check_in', 'x', '00000000-0000-0000-0000-0000000000b1', 'practitioner')$$, 'patient cannot pose as practitioner');
select _works($$insert into case_entries (id, case_id, kind, body, author_id, author_role) values ('00000000-0000-0000-0000-0000000e0001', '00000000-0000-0000-0000-0000000c0001', 'check_in', 'Feeling a bit better', '00000000-0000-0000-0000-0000000000b1', 'patient')$$, 'patient adds a check-in');
select _fails($$insert into case_entries (case_id, kind, body, author_id, author_role) values ('00000000-0000-0000-0000-0000000c0003', 'check_in', 'x', '00000000-0000-0000-0000-0000000000b1', 'patient')$$, 'patient cannot write into another patient case');
select _works($$insert into case_entries (case_id, kind, body, author_id, author_role, meta) values ('00000000-0000-0000-0000-0000000c0001', 'check_in', 'Slept well', '00000000-0000-0000-0000-0000000000b1', 'patient', '{"feeling":"better"}')$$, 'patient check-in with feeling');
select _fails($$insert into case_entries (case_id, kind, body, author_id, author_role, meta) values ('00000000-0000-0000-0000-0000000c0001', 'check_in', 'x', '00000000-0000-0000-0000-0000000000b1', 'patient', '{"event":"case_closed","outcome":"resolved"}')$$, 'patient cannot fake a system event in meta');
select _count('select * from patients', 1, 'patient sees only own patient record');
select _count('select * from treatment_cases', 1, 'patient sees only own case');
select _count('select * from practitioners', 0, 'patient cannot read practitioners table');
select _count('select * from record_access_log', 0, 'patient cannot read access log');
select _fails($$update patients set consent_version = 'v0' where id = '00000000-0000-0000-0000-0000000000f1'$$, 'patient cannot alter own consent record');
select _fails($$update treatment_cases set status = 'active' where id = '00000000-0000-0000-0000-0000000c0001'$$, 'patient cannot change case status');

select _as('00000000-0000-0000-0000-0000000000b2', 'aal1');
select _count('select * from treatment_cases', 0, 'other patient sees no cases');
select _count('select * from case_entries', 0, 'other patient sees no entries');
select _count('select * from patients', 0, 'other patient sees no patients');

-- ---------------------------------------------------------------- staff and unassigned visibility
select _as('00000000-0000-0000-0000-0000000000e1', 'aal2');
select _count('select * from patients', 0, 'staff (even with MFA) sees no patients');
select _count('select * from treatment_cases', 0, 'staff sees no cases');
select _count('select * from case_entries', 0, 'staff sees no entries');
select _count('select * from case_entry_files', 0, 'staff sees no files');
select _count('select * from practitioners', 0, 'staff sees no practitioners');

select _as('00000000-0000-0000-0000-0000000000d1', 'aal2');
select _count($$select * from treatment_cases where id = '00000000-0000-0000-0000-0000000c0001'$$, 0, 'practitioner cannot see unassigned case');
select _count($$select * from patients where id = '00000000-0000-0000-0000-0000000000f1'$$, 0, 'practitioner cannot see unassigned patient');

-- ---------------------------------------------------------------- admin assignment
select _as('00000000-0000-0000-0000-0000000000a1', 'aal1');
select _count('select * from treatment_cases', 0, 'admin without MFA sees no cases');
select _as('00000000-0000-0000-0000-0000000000a1', 'aal2');
select _count('select * from treatment_cases', 2, 'admin with MFA sees all cases');
select _fails($$update treatment_cases set practitioner_id = '00000000-0000-0000-0000-0000000000bb' where id = '00000000-0000-0000-0000-0000000c0001'$$, 'cannot assign case to unverified practitioner');
select _works($$update treatment_cases set practitioner_id = '00000000-0000-0000-0000-0000000000aa' where id = '00000000-0000-0000-0000-0000000c0001'$$, 'admin assigns case to A');
select _count($$select * from case_entries where case_id = '00000000-0000-0000-0000-0000000c0001' and meta->>'event' = 'assigned' and author_role = 'admin'$$, 1, 'assignment written to timeline automatically');
select _fails($$insert into case_entries (case_id, kind, body, author_id, author_role) values ('00000000-0000-0000-0000-0000000c0001', 'note', 'x', '00000000-0000-0000-0000-0000000000a1', 'admin')$$, 'admin cannot write clinical entries');

-- ---------------------------------------------------------------- practitioner works the case
select _as('00000000-0000-0000-0000-0000000000d1', 'aal2');
select _count($$select * from treatment_cases where id = '00000000-0000-0000-0000-0000000c0001'$$, 1, 'assigned practitioner sees the case');
select _count($$select * from patients where id = '00000000-0000-0000-0000-0000000000f1'$$, 1, 'assigned practitioner sees the patient');
select _works($$insert into case_entries (id, case_id, kind, body, author_id, author_role) values ('00000000-0000-0000-0000-0000000e0002', '00000000-0000-0000-0000-0000000c0001', 'assessment', 'HBsAg positive', '00000000-0000-0000-0000-0000000000d1', 'practitioner')$$, 'practitioner writes assessment');
select _works($$insert into case_entries (case_id, kind, body, author_id, author_role, visible_to_patient) values ('00000000-0000-0000-0000-0000000c0001', 'note', 'private clinical note', '00000000-0000-0000-0000-0000000000d1', 'practitioner', false)$$, 'practitioner writes private note');
select _fails($$insert into case_entries (case_id, kind, body, author_id, author_role, meta) values ('00000000-0000-0000-0000-0000000c0001', 'note', 'x', '00000000-0000-0000-0000-0000000000d1', 'practitioner', '{"event":"case_closed"}')$$, 'practitioner cannot fake a system event in meta');
select _fails($$insert into case_entries (case_id, kind, body, author_id, author_role) values ('00000000-0000-0000-0000-0000000c0001', 'outcome', 'cured!', '00000000-0000-0000-0000-0000000000d1', 'practitioner')$$, 'practitioner cannot write an outcome entry directly');
select _works($$insert into case_entries (case_id, kind, body, author_id, author_role, order_id) values ('00000000-0000-0000-0000-0000000c0001', 'product_dispensed', 'Liver tonic x2', '00000000-0000-0000-0000-0000000000d1', 'practitioner', '00000000-0000-0000-0000-00000000f001')$$, 'practitioner links the patient own order');
select _fails($$insert into case_entries (case_id, kind, body, author_id, author_role, order_id) values ('00000000-0000-0000-0000-0000000c0001', 'product_dispensed', 'x', '00000000-0000-0000-0000-0000000000d1', 'practitioner', '00000000-0000-0000-0000-00000000f002')$$, 'practitioner cannot link another customer order');
select _works($$insert into case_entries (case_id, kind, body, author_id, author_role, corrects_entry_id) values ('00000000-0000-0000-0000-0000000c0001', 'correction', 'HBsAg positive, HBeAg negative', '00000000-0000-0000-0000-0000000000d1', 'practitioner', '00000000-0000-0000-0000-0000000e0002')$$, 'practitioner adds correction');
select _fails($$insert into case_entries (case_id, kind, body, author_id, author_role, corrects_entry_id) values ('00000000-0000-0000-0000-0000000c0003', 'correction', 'x', '00000000-0000-0000-0000-0000000000d1', 'practitioner', '00000000-0000-0000-0000-0000000e0002')$$, 'correction must point at the same case');
select _fails($$update case_entries set body = 'edited' where id = '00000000-0000-0000-0000-0000000e0002'$$, 'practitioner cannot edit an entry');
select _fails($$delete from case_entries where id = '00000000-0000-0000-0000-0000000e0002'$$, 'practitioner cannot delete an entry');
select _fails($$update treatment_cases set practitioner_id = null where id = '00000000-0000-0000-0000-0000000c0001'$$, 'practitioner cannot reassign case');
select _fails($$update treatment_cases set status = 'resolved' where id = '00000000-0000-0000-0000-0000000c0001'$$, 'cannot mark resolved without an outcome');
select _fails($$update treatment_cases set outcome = 'improved' where id = '00000000-0000-0000-0000-0000000c0001'$$, 'cannot close without an outcome note');
select _works($$update treatment_cases set status = 'improving' where id = '00000000-0000-0000-0000-0000000c0001'$$, 'practitioner sets status improving');
select _count($$select * from case_entries where case_id = '00000000-0000-0000-0000-0000000c0001' and meta->>'event' = 'status_changed' and author_role = 'practitioner'$$, 1, 'status change written to timeline');

select _as('00000000-0000-0000-0000-0000000000b1', 'aal1');
select _count($$select * from case_entries where case_id = '00000000-0000-0000-0000-0000000c0001'$$, 8, 'patient sees all entries except the private note');
select _count($$select * from case_entries where visible_to_patient = false$$, 0, 'patient never sees private notes');
select _fails($$insert into case_entries (case_id, kind, body, author_id, author_role, corrects_entry_id) values ('00000000-0000-0000-0000-0000000c0001', 'correction', 'x', '00000000-0000-0000-0000-0000000000b1', 'patient', '00000000-0000-0000-0000-0000000e0002')$$, 'patient cannot correct a practitioner entry');
select _works($$insert into case_entries (case_id, kind, body, author_id, author_role, corrects_entry_id) values ('00000000-0000-0000-0000-0000000c0001', 'correction', 'I meant 2 months', '00000000-0000-0000-0000-0000000000b1', 'patient', '00000000-0000-0000-0000-0000000e0001')$$, 'patient corrects own check-in');

select _as('00000000-0000-0000-0000-0000000000d1', 'aal2');
select _works($$update treatment_cases set outcome = 'improved', outcome_note = 'Viral load down; symptoms eased' where id = '00000000-0000-0000-0000-0000000c0001'$$, 'practitioner closes case with outcome');
select _count($$select * from treatment_cases where id = '00000000-0000-0000-0000-0000000c0001' and status = 'discontinued' and closed_at is not null$$, 1, 'closing derives status and closed_at');
select _count($$select * from case_entries where case_id = '00000000-0000-0000-0000-0000000c0001' and kind = 'outcome'$$, 1, 'outcome written to timeline');
select _fails($$update treatment_cases set outcome = 'resolved' where id = '00000000-0000-0000-0000-0000000c0001'$$, 'cannot rewrite outcome of a closed case');
select _works($$insert into case_entries (case_id, kind, body, author_id, author_role) values ('00000000-0000-0000-0000-0000000c0001', 'lab_result', 'Late lab', '00000000-0000-0000-0000-0000000000d1', 'practitioner')$$, 'practitioner can still add a late lab result to a closed case');

select _as('00000000-0000-0000-0000-0000000000b1', 'aal1');
select _fails($$insert into case_entries (case_id, kind, body, author_id, author_role) values ('00000000-0000-0000-0000-0000000c0001', 'check_in', 'x', '00000000-0000-0000-0000-0000000000b1', 'patient')$$, 'patient cannot check in on a closed case');

select _as('00000000-0000-0000-0000-0000000000d1', 'aal2');
select _works($$update treatment_cases set outcome = null where id = '00000000-0000-0000-0000-0000000c0001'$$, 'practitioner reopens case');
select _count($$select * from treatment_cases where id = '00000000-0000-0000-0000-0000000c0001' and status = 'active' and closed_at is null and outcome_note is null$$, 1, 'reopen resets status');
select _works($$update treatment_cases set condition = 'Hepatitis B (chronic)' where id = '00000000-0000-0000-0000-0000000c0001'$$, 'practitioner refines condition');
select _count($$select * from case_entries where case_id = '00000000-0000-0000-0000-0000000c0001' and meta->>'event' = 'condition_changed'$$, 1, 'condition change written to timeline');

-- ---------------------------------------------------------------- access log
select _fails($$insert into record_access_log (actor_id, actor_role, action) values ('00000000-0000-0000-0000-0000000000d1', 'practitioner', 'view_case')$$, 'browser sessions cannot write the access log');
reset role;
set role service_role;
select _works($$insert into record_access_log (actor_id, actor_role, action, case_id) values ('00000000-0000-0000-0000-0000000000d1', 'practitioner', 'view_case', '00000000-0000-0000-0000-0000000c0001')$$, 'service role writes access log');
reset role;
set role authenticated;
select _as('00000000-0000-0000-0000-0000000000a1', 'aal2');
select _count('select * from record_access_log', 1, 'admin with MFA reads access log');
reset role;
select _fails($$update record_access_log set action = 'x'$$, 'access log cannot be edited (even as superuser)');
select _fails($$delete from record_access_log$$, 'access log cannot be deleted (even as superuser)');
select _fails($$update case_entries set body = 'x'$$, 'entries cannot be edited (even as superuser)');
select _fails($$delete from case_entries$$, 'entries cannot be deleted directly (even as superuser)');

-- ---------------------------------------------------------------- anon role
set role anon;
select _fails($$select * from patients$$, 'anon role has no access to patients at all');
reset role;

-- ---------------------------------------------------------------- revocation
set role authenticated;
select _as('00000000-0000-0000-0000-0000000000a1', 'aal2');
select _works($$update practitioners set revoked_at = now(), revoked_reason = 'Licence lapsed' where id = '00000000-0000-0000-0000-0000000000aa'$$, 'admin revokes A');
select _as('00000000-0000-0000-0000-0000000000d1', 'aal2');
select _count('select * from treatment_cases', 0, 'revoked practitioner sees no cases');
select _count('select * from patients', 0, 'revoked practitioner sees no patients');
reset role;
select _count($$select * from profiles where id = '00000000-0000-0000-0000-0000000000d1' and role::text = 'customer'$$, 1, 'revoked practitioner role reset to customer');

-- ---------------------------------------------------------------- erasure
set role service_role;
select _works($$delete from patients where id = '00000000-0000-0000-0000-0000000000f3'$$, 'service role erases a whole patient record (cascade)');
reset role;
select _count($$select * from case_entries where case_id = '00000000-0000-0000-0000-0000000c0003'$$, 0, 'erased patient entries are gone');

\pset footer off
select n, case when ok then 'PASS' else 'FAIL' end as result, label, info from _results order by n;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from _results;
