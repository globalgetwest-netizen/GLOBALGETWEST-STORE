-- Every new Supabase Auth user automatically gets a 'customer' profile row.
-- Staff/admin roles are never self-assigned — an admin promotes a profile's
-- role manually (via the admin portal, built in a later phase) after the
-- person has signed up normally.

create function handle_new_auth_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'customer');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
