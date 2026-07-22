
DROP POLICY IF EXISTS "Anyone signed in can read permissions" ON public.role_permissions;
CREATE POLICY "Users read own role permissions" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR role IN (SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated read app_settings" ON public.app_settings;
CREATE POLICY "Read public app_settings" ON public.app_settings
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR key = 'office_hours');
