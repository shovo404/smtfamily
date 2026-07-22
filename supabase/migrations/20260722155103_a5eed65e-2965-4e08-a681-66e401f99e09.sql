ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS check_in_photo_url text,
  ADD COLUMN IF NOT EXISTS check_out_photo_url text,
  ADD COLUMN IF NOT EXISTS check_in_face_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS check_out_face_verified boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','super_admin','hr'));
$$;

DROP POLICY IF EXISTS "attendance faces: user upload own" ON storage.objects;
CREATE POLICY "attendance faces: user upload own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'attendance-faces'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "attendance faces: user read own" ON storage.objects;
CREATE POLICY "attendance faces: user read own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'attendance-faces'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin(auth.uid())
    )
  );