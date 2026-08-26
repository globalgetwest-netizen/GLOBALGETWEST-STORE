-- Adds email to profiles (denormalized from auth.users) so admins can look
-- up a customer by email to promote them to staff, without needing the
-- Supabase Admin API for something this simple.

alter table profiles add column if not exists email text;

create unique index if not exists idx_profiles_email on profiles(email) where email is not null;

-- Update the signup trigger to populate it
create or replace function handle_new_auth_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (new.id, new.raw_user_meta_data->>'full_name', 'customer', new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Backfill for any users created before this migration
update profiles p set email = u.email
from auth.users u
where p.id = u.id and p.email is null;
