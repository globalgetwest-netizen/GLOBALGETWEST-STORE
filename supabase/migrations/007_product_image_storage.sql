-- Product image uploads via Supabase Storage. Public read (product photos
-- are meant to be visible to everyone), write restricted to admin/ceo only
-- — matches the same is_admin() used everywhere else in this schema (which
-- already covers 'admin' and 'ceo' after migration 006).

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "admin upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and is_admin());

create policy "admin update product images"
  on storage.objects for update
  using (bucket_id = 'product-images' and is_admin());

create policy "admin delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and is_admin());
