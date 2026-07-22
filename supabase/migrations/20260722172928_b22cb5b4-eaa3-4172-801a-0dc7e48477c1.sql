
-- Migrate legacy super_admin users to admin, and dsr users to sr
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::app_role FROM public.user_roles WHERE role = 'super_admin'
ON CONFLICT (user_id, role) DO NOTHING;
DELETE FROM public.user_roles WHERE role = 'super_admin';

INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'sr'::app_role FROM public.user_roles WHERE role = 'dsr'
ON CONFLICT (user_id, role) DO NOTHING;
DELETE FROM public.user_roles WHERE role = 'dsr';

-- New signups (created via admin) default to sr; the first user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'sr');
  END IF;
  RETURN NEW;
END;
$$;
