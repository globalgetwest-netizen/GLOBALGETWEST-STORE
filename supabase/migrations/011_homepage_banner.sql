-- A single, admin-editable homepage banner — lets the admin upload their
-- own image (with real rights to it) and control the caption/link, without
-- needing a code change for every homepage image swap.
create table homepage_banner (
  id int primary key default 1,
  image_url text,
  caption text,
  link_url text,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into homepage_banner (id) values (1);

alter table homepage_banner enable row level security;

create policy "public can view banner" on homepage_banner
  for select using (true);

create policy "admin can update banner" on homepage_banner
  for update using (is_admin());
