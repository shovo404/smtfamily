-- =============================================================================
-- Storage Fix: Add profile-photos bucket & make app-assets public
-- =============================================================================

-- 1. Create the missing profile-photos bucket (public = true so <img> can load)
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

-- 2. Make app-assets public (logo images load via <img> without auth headers)
update storage.buckets set public = true
where id = 'app-assets' and public = false;

-- 3. Profile-photos RLS: authenticated users upload to their own folder
drop policy if exists "profile photos upload" on storage.objects;
create policy "profile photos upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Profile-photos RLS: authenticated users can read any profile photo
drop policy if exists "profile photos read" on storage.objects;
create policy "profile photos read" on storage.objects
  for select to authenticated
  using (bucket_id = 'profile-photos');

-- 5. App-assets RLS: authenticated users can read assets (logos, etc.)
drop policy if exists "app assets read" on storage.objects;
create policy "app assets read" on storage.objects
  for select to authenticated
  using (bucket_id = 'app-assets');
