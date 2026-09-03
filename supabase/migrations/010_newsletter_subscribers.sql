-- Real newsletter signup storage — a genuine premium-storefront staple that
-- was entirely missing. Kept simple: email + timestamp, public insert only
-- (no read/update/delete from the client — that's an admin/CEO concern for
-- a future export feature, not built yet).

create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table newsletter_subscribers enable row level security;

create policy "anyone can subscribe" on newsletter_subscribers
  for insert with check (true);

create policy "admin can view subscribers" on newsletter_subscribers
  for select using (is_admin());
