-- 017_patient_records.sql
-- Patient treatment records: one record per patient, one case per condition,
-- and an append-only timeline per case from first consultation to final
-- outcome. Written and signed by licensed practitioners; patients see their
-- own records read-only and add their own check-ins.
--
-- Health data is special-category personal data (Ghana Data Protection Act
-- 2012, Nigeria NDPA 2023, GDPR art. 9). Everything below is built so the
-- DATABASE is the boundary, not the app:
--   * a patient sees only their own cases, and only entries marked visible
--   * a practitioner sees only cases assigned to them
--   * admin/CEO see everything
--   * ordinary staff and agents see nothing (is_staff_or_admin() is NOT used
--     anywhere in this file, on purpose)
--   * practitioner and admin access requires an MFA session (aal2) — checked
--     here in RLS, not just in the app
--   * timeline entries can never be edited or deleted; mistakes are fixed by
--     a new 'correction' entry that points at the original
--
-- Safe to paste into the SQL Editor in one go. Unlike migration 006, the new
-- enum value 'practitioner' is never USED in this script (comparisons go
-- through role::text, and the only write of it is inside a plpgsql body that
-- runs later), so the "unsafe use of new value" error cannot happen.

-- ----------------------------------------------------------------------------
-- 1. Types
-- ----------------------------------------------------------------------------

alter type user_role add value if not exists 'practitioner';

create type case_status as enum ('intake', 'active', 'improving', 'resolved', 'discontinued', 'referred');
create type case_outcome as enum ('resolved', 'improved', 'no_change', 'worsened', 'referred_to_hospital', 'lost_to_follow_up');
create type case_entry_kind as enum (
  'intake', 'assessment', 'plan', 'product_dispensed', 'check_in',
  'lab_result', 'note', 'outcome', 'correction'
);
-- 'admin' is used only for entries the database writes itself when an admin
-- assigns a case (see trigger below) — admins cannot write clinical entries.
create type case_author_role as enum ('practitioner', 'patient', 'admin');
create type patient_sex as enum ('female', 'male', 'intersex', 'not_stated');
create type consent_method as enum ('self_online', 'recorded_by_practitioner');

-- ----------------------------------------------------------------------------
-- 2. Tables
-- ----------------------------------------------------------------------------

-- A practitioner is a profile plus a licence that an admin has checked with
-- the licensing body. Access to records depends on this row (verified, not
-- revoked, not expired) — not on profiles.role alone.
create table practitioners (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete restrict,
  display_name text not null check (length(trim(display_name)) > 0),
  specialty text,
  license_number text not null check (length(trim(license_number)) > 0),
  licensing_body text not null check (length(trim(licensing_body)) > 0),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  license_expires_on date,
  added_by uuid references profiles(id),
  verified_at timestamptz,
  verified_by uuid references profiles(id),
  revoked_at timestamptz,
  revoked_by uuid references profiles(id),
  revoked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table patients (
  id uuid primary key default gen_random_uuid(),
  -- Null for someone a practitioner registered (e.g. a WhatsApp or walk-in
  -- consultation) who has no account yet; linked when they sign up and
  -- claim the record with the same, confirmed email address.
  profile_id uuid unique references profiles(id) on delete set null,
  full_name text not null check (length(trim(full_name)) > 0),
  date_of_birth date check (date_of_birth >= '1900-01-01'),
  sex patient_sex,
  phone text,
  email text,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  -- No record without consent: both columns are NOT NULL.
  consent_given_at timestamptz not null,
  consent_version text not null check (length(trim(consent_version)) > 0),
  consent_method consent_method not null,
  consent_recorded_by uuid references profiles(id),
  created_by_practitioner_id uuid references practitioners(id),
  -- One-time code a practitioner gives the patient so they can link this
  -- record to their own account later. Only a SHA-256 hash is stored.
  claim_code_hash text,
  claim_code_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consent_recorded_by_matches_method check (
    (consent_method = 'recorded_by_practitioner') = (consent_recorded_by is not null)
  )
);

create index idx_patients_email on patients (lower(email)) where email is not null;
create index idx_patients_created_by on patients (created_by_practitioner_id);

-- One case per condition being treated.
create table treatment_cases (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  condition text not null check (length(trim(condition)) between 1 and 200),
  category_id uuid references categories(id) on delete set null,
  practitioner_id uuid references practitioners(id) on delete restrict,
  status case_status not null default 'intake',
  started_at timestamptz not null default now(),
  closed_at timestamptz,
  outcome case_outcome,
  outcome_note text,
  opened_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A case is closed exactly when it has an outcome, closed cases carry a
  -- closing status, and the outcome must say what actually happened.
  constraint outcome_closes_case check ((outcome is null) = (closed_at is null)),
  constraint closing_status_needs_outcome check (
    (status in ('resolved', 'discontinued', 'referred')) = (outcome is not null)
  ),
  constraint outcome_needs_note check (
    outcome is null or length(trim(coalesce(outcome_note, ''))) > 0
  )
);

create index idx_cases_patient on treatment_cases (patient_id);
create index idx_cases_practitioner on treatment_cases (practitioner_id);
create index idx_cases_status on treatment_cases (status);

-- The timeline. Append-only: no UPDATE, no DELETE (enforced by trigger, for
-- every role including service role). The only way rows leave is when the
-- whole patient record is erased on a verified deletion request.
create table case_entries (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references treatment_cases(id) on delete cascade,
  kind case_entry_kind not null,
  body text not null check (length(trim(body)) between 1 and 20000),
  author_id uuid references profiles(id),
  author_role case_author_role not null,
  order_id uuid references orders(id) on delete restrict,
  corrects_entry_id uuid references case_entries(id),
  visible_to_patient boolean not null default true,
  -- Structured, non-clinical details for entries the database writes itself
  -- (status changes, assignment), e.g. {"event":"status_changed","from":"active","to":"improving"}.
  meta jsonb,
  created_at timestamptz not null default now(),
  constraint correction_points_at_entry check ((kind = 'correction') = (corrects_entry_id is not null)),
  constraint order_only_on_dispensed check (order_id is null or kind = 'product_dispensed'),
  constraint patient_entries_visible check (author_role = 'practitioner' or visible_to_patient)
);

create index idx_entries_case on case_entries (case_id, created_at);

-- Photos / PDFs attached to an entry. Files live in the private
-- 'patient-files' bucket and are only ever served through short-lived signed
-- URLs from server routes; this table is what RLS checks first.
create table case_entry_files (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references case_entries(id) on delete cascade,
  case_id uuid not null references treatment_cases(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes int not null check (size_bytes > 0),
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_entry_files_entry on case_entry_files (entry_id);
create index idx_entry_files_case on case_entry_files (case_id);

-- Who viewed or changed which record, and when. No foreign keys on purpose:
-- the log must survive a patient's erasure or an account deletion. Never
-- holds record contents — only ids and non-clinical metadata.
create table record_access_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_role text not null,
  action text not null,
  patient_id uuid,
  case_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index idx_access_log_case on record_access_log (case_id, created_at desc);
create index idx_access_log_patient on record_access_log (patient_id, created_at desc);
create index idx_access_log_actor on record_access_log (actor_id, created_at desc);

create trigger trg_practitioners_updated_at before update on practitioners for each row execute function set_updated_at();
create trigger trg_patients_updated_at before update on patients for each row execute function set_updated_at();
create trigger trg_cases_updated_at before update on treatment_cases for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Helper functions (same pattern as is_admin() / is_ceo())
-- ----------------------------------------------------------------------------

-- True only when the current session passed MFA.
create function has_aal2() returns boolean as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$ language sql stable;

-- The caller's practitioner id — only if their licence is verified, not
-- revoked, not expired, their profile is active, AND this session is aal2.
-- Null otherwise, which makes every "= active_practitioner_id()" check fail.
create function active_practitioner_id() returns uuid as $$
  select pr.id
  from practitioners pr
  join profiles p on p.id = pr.profile_id
  where pr.profile_id = auth.uid()
    and pr.verified_at is not null
    and pr.revoked_at is null
    and (pr.license_expires_on is null or pr.license_expires_on >= current_date)
    and p.is_active
    and has_aal2();
$$ language sql security definer stable set search_path = public;

-- Admin or CEO, with MFA.
create function is_records_admin() returns boolean as $$
  select is_admin() and has_aal2();
$$ language sql security definer stable set search_path = public;

create function is_own_patient(p_patient_id uuid) returns boolean as $$
  select exists (
    select 1 from patients where id = p_patient_id and profile_id = auth.uid()
  );
$$ language sql security definer stable set search_path = public;

create function is_own_case(p_case_id uuid) returns boolean as $$
  select exists (
    select 1 from treatment_cases c
    join patients pt on pt.id = c.patient_id
    where c.id = p_case_id and pt.profile_id = auth.uid()
  );
$$ language sql security definer stable set search_path = public;

create function is_assigned_practitioner(p_case_id uuid) returns boolean as $$
  select exists (
    select 1 from treatment_cases
    where id = p_case_id and practitioner_id = active_practitioner_id()
  );
$$ language sql security definer stable set search_path = public;

create function can_manage_case(p_case_id uuid) returns boolean as $$
  select is_records_admin() or is_assigned_practitioner(p_case_id);
$$ language sql security definer stable set search_path = public;

create function practitioner_has_case_for(p_patient_id uuid) returns boolean as $$
  select exists (
    select 1 from treatment_cases
    where patient_id = p_patient_id and practitioner_id = active_practitioner_id()
  );
$$ language sql security definer stable set search_path = public;

create function case_has_entries(p_case_id uuid) returns boolean as $$
  select exists (select 1 from case_entries where case_id = p_case_id);
$$ language sql security definer stable set search_path = public;

-- ----------------------------------------------------------------------------
-- 4. Integrity triggers
-- ----------------------------------------------------------------------------

-- Practitioners: stamp who verified/revoked, forbid self-verification, and
-- keep profiles.role in step (customer <-> practitioner). Staff/admin/CEO
-- keep their own role — their record access still comes from this row.
create function practitioners_before_write() returns trigger as $$
begin
  if new.verified_at is distinct from (case when tg_op = 'UPDATE' then old.verified_at end) then
    if new.verified_at is not null then
      if auth.uid() is not null and auth.uid() = new.profile_id then
        raise exception 'You cannot verify your own practitioner licence';
      end if;
      new.verified_at := now();
      new.verified_by := auth.uid();
    else
      new.verified_by := null;
    end if;
  end if;

  if new.revoked_at is distinct from (case when tg_op = 'UPDATE' then old.revoked_at end) then
    if new.revoked_at is not null then
      new.revoked_at := now();
      new.revoked_by := auth.uid();
    else
      new.revoked_by := null;
      new.revoked_reason := null;
    end if;
  end if;

  if tg_op = 'UPDATE' and new.profile_id is distinct from old.profile_id then
    raise exception 'A practitioner record cannot be moved to another account';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_practitioners_before_write
  before insert or update on practitioners
  for each row execute function practitioners_before_write();

create function practitioners_sync_role() returns trigger as $$
begin
  if new.verified_at is not null and new.revoked_at is null then
    update profiles set role = 'practitioner'
      where id = new.profile_id and role::text = 'customer';
  else
    update profiles set role = 'customer'
      where id = new.profile_id and role::text = 'practitioner';
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_practitioners_sync_role
  after insert or update of verified_at, revoked_at on practitioners
  for each row execute function practitioners_sync_role();

-- Patients: only admin (or the service role, used for the claim flow) may
-- relink the account or change the consent record.
create function patients_protect_fields() returns trigger as $$
begin
  if auth.uid() is not null and not is_records_admin() then
    if new.profile_id is distinct from old.profile_id
       or new.consent_given_at is distinct from old.consent_given_at
       or new.consent_version is distinct from old.consent_version
       or new.consent_method is distinct from old.consent_method
       or new.consent_recorded_by is distinct from old.consent_recorded_by
       or new.created_by_practitioner_id is distinct from old.created_by_practitioner_id then
      raise exception 'Only an administrator can change account links or consent records';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_patients_protect_fields
  before update on patients
  for each row execute function patients_protect_fields();

-- Cases: closing/reopening rules, assignment rules.
create function treatment_cases_before_write() returns trigger as $$
begin
  if new.practitioner_id is not null
     and (tg_op = 'INSERT' or new.practitioner_id is distinct from old.practitioner_id)
     and not exists (
       select 1 from practitioners
       where id = new.practitioner_id and verified_at is not null and revoked_at is null
     ) then
    raise exception 'Cases can only be assigned to a verified practitioner';
  end if;

  if tg_op = 'INSERT' then
    new.opened_by := coalesce(auth.uid(), new.opened_by);
    new.started_at := coalesce(new.started_at, now());
    if new.outcome is not null then
      raise exception 'A new case cannot start closed';
    end if;
    return new;
  end if;

  if new.patient_id is distinct from old.patient_id then
    raise exception 'A case cannot be moved to another patient';
  end if;
  if new.opened_by is distinct from old.opened_by or new.started_at is distinct from old.started_at then
    raise exception 'Case opening details cannot be changed';
  end if;
  if auth.uid() is not null and not is_records_admin()
     and new.practitioner_id is distinct from old.practitioner_id then
    raise exception 'Only an administrator can reassign a case';
  end if;

  if old.outcome is not null and new.outcome is not null
     and (new.outcome is distinct from old.outcome or new.outcome_note is distinct from old.outcome_note) then
    raise exception 'This case is closed. Reopen it before recording a different outcome';
  end if;

  if old.outcome is null and new.outcome is not null then
    -- Closing: the status follows from what actually happened.
    new.closed_at := now();
    new.status := case new.outcome
      when 'resolved' then 'resolved'::case_status
      when 'referred_to_hospital' then 'referred'::case_status
      else 'discontinued'::case_status
    end;
  elsif old.outcome is not null and new.outcome is null then
    -- Reopening.
    new.closed_at := null;
    new.outcome_note := null;
    if new.status in ('resolved', 'discontinued', 'referred') then
      new.status := 'active';
    end if;
  elsif new.outcome is null and new.status in ('resolved', 'discontinued', 'referred') then
    raise exception 'Close the case with an outcome to set status %', new.status;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_cases_before_write
  before insert or update on treatment_cases
  for each row execute function treatment_cases_before_write();

-- Every status change, closure, reopening and assignment is written to the
-- timeline by the database itself, so the history cannot be skipped.
create function treatment_cases_log_changes() returns trigger as $$
declare
  actor_role case_author_role;
  assignee text;
begin
  actor_role := case
    when new.practitioner_id is not null and new.practitioner_id = active_practitioner_id() then 'practitioner'::case_author_role
    else 'admin'::case_author_role
  end;

  if new.practitioner_id is distinct from old.practitioner_id then
    select display_name into assignee from practitioners where id = new.practitioner_id;
    insert into case_entries (case_id, kind, body, author_id, author_role, meta)
    values (
      new.id, 'note',
      case when assignee is null then 'Case unassigned.' else 'Case assigned to ' || assignee || '.' end,
      auth.uid(), 'admin',
      jsonb_build_object('event', 'assigned', 'practitioner_id', new.practitioner_id)
    );
  end if;

  if new.condition is distinct from old.condition then
    insert into case_entries (case_id, kind, body, author_id, author_role, meta)
    values (
      new.id, 'note', 'Condition updated from "' || old.condition || '" to "' || new.condition || '".',
      auth.uid(), actor_role,
      jsonb_build_object('event', 'condition_changed')
    );
  end if;

  if old.outcome is null and new.outcome is not null then
    insert into case_entries (case_id, kind, body, author_id, author_role, meta)
    values (
      new.id, 'outcome', new.outcome_note, auth.uid(), actor_role,
      jsonb_build_object('event', 'case_closed', 'outcome', new.outcome, 'status', new.status)
    );
  elsif old.outcome is not null and new.outcome is null then
    insert into case_entries (case_id, kind, body, author_id, author_role, meta)
    values (
      new.id, 'note', 'Case reopened.', auth.uid(), actor_role,
      jsonb_build_object('event', 'case_reopened', 'previous_outcome', old.outcome, 'status', new.status)
    );
  elsif new.status is distinct from old.status then
    insert into case_entries (case_id, kind, body, author_id, author_role, meta)
    values (
      new.id, 'note', 'Status changed from ' || old.status || ' to ' || new.status || '.',
      auth.uid(), actor_role,
      jsonb_build_object('event', 'status_changed', 'from', old.status, 'to', new.status)
    );
  end if;

  return null;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_cases_log_changes
  after update on treatment_cases
  for each row execute function treatment_cases_log_changes();

-- Entries: validate links and closed-case rules on the way in.
create function case_entries_before_insert() returns trigger as $$
declare
  c record;
  original record;
begin
  new.created_at := now();

  select tc.id, tc.outcome, pt.profile_id, pt.email
    into c
    from treatment_cases tc join patients pt on pt.id = tc.patient_id
    where tc.id = new.case_id;

  if new.author_role = 'patient' and c.outcome is not null then
    raise exception 'This case is closed. Please contact your practitioner';
  end if;

  if new.corrects_entry_id is not null then
    select case_id, author_id, author_role, visible_to_patient into original
      from case_entries where id = new.corrects_entry_id;
    if original.case_id is distinct from new.case_id then
      raise exception 'A correction must refer to an entry in the same case';
    end if;
    if new.author_role = 'patient' and original.author_id is distinct from new.author_id then
      raise exception 'Patients can only correct their own check-ins';
    end if;
    -- A correction to something the patient can see must be visible too.
    if original.visible_to_patient then
      new.visible_to_patient := true;
    end if;
  end if;

  if new.order_id is not null and not exists (
    select 1 from orders o
    left join profiles cp on cp.id = o.customer_id
    where o.id = new.order_id
      and (
        (c.profile_id is not null and o.customer_id = c.profile_id)
        or (c.email is not null and lower(o.contact_email) = lower(c.email))
        or (c.email is not null and lower(cp.email) = lower(c.email))
      )
  ) then
    raise exception 'That order does not belong to this patient';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_entries_before_insert
  before insert on case_entries
  for each row execute function case_entries_before_insert();

-- Append-only. A direct UPDATE or DELETE always fails, whoever runs it. The
-- one exception is a cascade from erasing the whole patient record
-- (pg_trigger_depth() > 1 means we were called from the foreign-key cascade).
create function forbid_record_changes() returns trigger as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception '% rows are permanent and cannot be % — add a correction entry instead',
    tg_table_name, lower(tg_op) || 'd';
end;
$$ language plpgsql;

create trigger trg_entries_append_only
  before update or delete on case_entries
  for each row execute function forbid_record_changes();

create trigger trg_entry_files_append_only
  before update or delete on case_entry_files
  for each row execute function forbid_record_changes();

create function forbid_log_changes() returns trigger as $$
begin
  raise exception 'record_access_log is append-only';
end;
$$ language plpgsql;

create trigger trg_access_log_append_only
  before update or delete on record_access_log
  for each row execute function forbid_log_changes();

-- ----------------------------------------------------------------------------
-- 5. Row Level Security
-- ----------------------------------------------------------------------------

alter table practitioners enable row level security;
alter table patients enable row level security;
alter table treatment_cases enable row level security;
alter table case_entries enable row level security;
alter table case_entry_files enable row level security;
alter table record_access_log enable row level security;

-- Signed-out visitors never touch any of this.
revoke all on practitioners, patients, treatment_cases, case_entries, case_entry_files, record_access_log from anon;

-- practitioners
create policy "practitioner reads own record" on practitioners
  for select using (profile_id = auth.uid() or is_records_admin());
create policy "records admin adds practitioners" on practitioners
  for insert with check (is_records_admin() and verified_at is null and revoked_at is null);
create policy "records admin manages practitioners" on practitioners
  for update using (is_records_admin()) with check (is_records_admin());

-- patients
create policy "patient reads own record" on patients
  for select using (
    profile_id = auth.uid()
    or is_records_admin()
    or (active_practitioner_id() is not null and created_by_practitioner_id = active_practitioner_id())
    or practitioner_has_case_for(id)
  );
create policy "patient gives consent" on patients
  for insert with check (
    profile_id = auth.uid()
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and consent_method = 'self_online'
    and consent_recorded_by is null
    and created_by_practitioner_id is null
  );
create policy "practitioner registers patient" on patients
  for insert with check (
    active_practitioner_id() is not null
    and created_by_practitioner_id = active_practitioner_id()
    and consent_method = 'recorded_by_practitioner'
    and consent_recorded_by = auth.uid()
    and profile_id is null
  );
create policy "practitioner or admin updates patient details" on patients
  for update using (
    is_records_admin()
    or (active_practitioner_id() is not null and created_by_practitioner_id = active_practitioner_id())
    or practitioner_has_case_for(id)
  ) with check (
    is_records_admin()
    or (active_practitioner_id() is not null and created_by_practitioner_id = active_practitioner_id())
    or practitioner_has_case_for(id)
  );

-- treatment_cases
create policy "read own or assigned cases" on treatment_cases
  for select using (
    is_records_admin()
    or (practitioner_id is not null and practitioner_id = active_practitioner_id())
    or is_own_patient(patient_id)
  );
create policy "patient requests a consultation" on treatment_cases
  for insert with check (
    is_own_patient(patient_id)
    and practitioner_id is null
    and status = 'intake'
    and outcome is null
  );
create policy "practitioner opens a case" on treatment_cases
  for insert with check (
    active_practitioner_id() is not null
    and practitioner_id = active_practitioner_id()
    and (
      exists (select 1 from patients p where p.id = patient_id and p.created_by_practitioner_id = active_practitioner_id())
      or practitioner_has_case_for(patient_id)
    )
    and status in ('intake', 'active')
    and outcome is null
  );
create policy "records admin opens a case" on treatment_cases
  for insert with check (is_records_admin() and outcome is null);
create policy "assigned practitioner or admin updates case" on treatment_cases
  for update using (
    is_records_admin() or (practitioner_id is not null and practitioner_id = active_practitioner_id())
  ) with check (
    is_records_admin() or (practitioner_id is not null and practitioner_id = active_practitioner_id())
  );

-- case_entries (no update/delete policies — and the trigger blocks them anyway)
create policy "read entries" on case_entries
  for select using (
    can_manage_case(case_id)
    or (visible_to_patient and is_own_case(case_id))
  );
create policy "practitioner writes entries" on case_entries
  for insert with check (
    author_id = auth.uid()
    and author_role = 'practitioner'
    and meta is null                 -- meta is reserved for database-written events
    and kind <> 'outcome'            -- outcomes come only from closing the case
    and is_assigned_practitioner(case_id)
  );
create policy "patient writes check-ins" on case_entries
  for insert with check (
    author_id = auth.uid()
    and author_role = 'patient'
    and visible_to_patient
    and order_id is null
    -- The only thing a patient may put in meta is how they feel.
    and (
      meta is null
      or (
        meta - 'feeling' = '{}'::jsonb
        and meta ->> 'feeling' in ('much_better', 'better', 'same', 'worse', 'much_worse')
      )
    )
    and is_own_case(case_id)
    and (
      kind = 'check_in'
      or kind = 'correction'
      or (kind = 'intake' and not case_has_entries(case_id))
    )
  );

-- case_entry_files: inserted only by server routes (service role) after the
-- upload; readable on the same terms as the entry it belongs to.
create policy "read entry files" on case_entry_files
  for select using (
    can_manage_case(case_id)
    or (
      is_own_case(case_id)
      and exists (select 1 from case_entries e where e.id = entry_id and e.visible_to_patient)
    )
  );

-- record_access_log: written only by server routes (service role); read by
-- admin/CEO with MFA.
create policy "records admin reads access log" on record_access_log
  for select using (is_records_admin());

-- ----------------------------------------------------------------------------
-- 6. Private storage bucket
-- ----------------------------------------------------------------------------
-- No storage.objects policies are created for this bucket, so no browser
-- session (patient, practitioner, admin or staff) can list, read or write it
-- directly. Server routes use the service role after checking access, and
-- hand out signed URLs that expire after 60 seconds.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-files', 'patient-files', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
