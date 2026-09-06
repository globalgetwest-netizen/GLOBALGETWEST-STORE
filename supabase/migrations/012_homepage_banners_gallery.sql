-- Replaces the single-slot homepage_banner (011) with a proper multi-row
-- gallery table, since one image was never going to be enough. If 011 was
-- already run, this cleanly drops it first; if not, the drop is a no-op.
drop table if exists homepage_banner;

create table homepage_banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text,
  link_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table homepage_banners enable row level security;

create policy "public can view active banners" on homepage_banners
  for select using (is_active = true or is_admin());

create policy "admin can manage banners" on homepage_banners
  for all using (is_admin());
