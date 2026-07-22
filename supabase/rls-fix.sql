-- =====================================================================
-- RLS Fixes — SMT Family
-- Run this in Supabase SQL Editor to fix all RLS policy issues.
-- =====================================================================

-- ═════════════════════════════════════════════════════════════════════
--  FIX 1: Profile-photos STORAGE INSERT policy
--  Problem: ANY authenticated user could upload to ANY user's folder.
--  Fix: Restrict to own folder via (storage.foldername(name))[1].
-- ═════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "profile photos: authenticated upload" ON storage.objects;
CREATE POLICY "profile photos: authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ═════════════════════════════════════════════════════════════════════
--  FIX 2: Profile-photos STORAGE UPDATE policy  ← MAIN BUG
--  Problem: Missing WITH CHECK clause — caused "new row violates
--  row-level security policy" when upserting an existing profile photo.
--  Also lacked file-ownership check.
--  Fix: Add WITH CHECK + restrict to own folder.
-- ═════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "profile photos: authenticated update own" ON storage.objects;
CREATE POLICY "profile photos: authenticated update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ═════════════════════════════════════════════════════════════════════
--  FIX 3: Profile-photos STORAGE DELETE policy
--  Problem: ANY authenticated user could delete ANY file in the bucket.
--  Fix: Restrict to own folder.
-- ═════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "profile photos: authenticated delete own" ON storage.objects;
CREATE POLICY "profile photos: authenticated delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ═════════════════════════════════════════════════════════════════════
--  FIX 4: Profiles — allow regular users to update their own profile
--  Problem: Only admins/HR could UPDATE profiles via RLS. Regular users
--  could not update their own photo_url via the client-side supabase
--  client (though the server function bypasses RLS via service_role).
--  This policy ensures consistency and allows future client-side updates.
-- ═════════════════════════════════════════════════════════════════════
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ═════════════════════════════════════════════════════════════════════
--  (Optional) Attendance-faces: add UPDATE policy for completeness
--  If the app ever needs to replace an existing attendance face photo,
--  this policy is required (same pattern as profile-photos fix).
-- ═════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "attendance faces: user upload own" ON storage.objects;
CREATE POLICY "attendance faces: user upload own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'attendance-faces'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "attendance faces: user update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'attendance-faces'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'attendance-faces'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ═════════════════════════════════════════════════════════════════════
--  VERIFICATION: List all policies after fixes
-- ═════════════════════════════════════════════════════════════════════
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS "using",
  with_check AS "with check"
FROM pg_policies
WHERE tablename IN ('profiles', 'employee_locations', 'location_pings', 'notifications', 'objects')
ORDER BY tablename, cmd;
