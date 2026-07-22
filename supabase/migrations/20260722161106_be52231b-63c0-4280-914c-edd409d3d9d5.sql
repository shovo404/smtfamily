
CREATE TABLE public.role_permissions (
  role app_role NOT NULL,
  permission text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role, permission)
);

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read permissions"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can modify permissions"
  ON public.role_permissions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Seed defaults from current matrix
INSERT INTO public.role_permissions (role, permission, enabled) VALUES
  -- super_admin: everything
  ('super_admin','manageEmployees',true),('super_admin','deleteEmployees',true),('super_admin','changeRoles',true),('super_admin','resetPasswords',true),
  ('super_admin','viewTasks',true),('super_admin','manageTasks',true),('super_admin','viewTA',true),('super_admin','manageTA',true),
  ('super_admin','viewLiveTracking',true),('super_admin','viewReports',true),('super_admin','manageSettings',true),('super_admin','managePermissions',true),
  -- admin
  ('admin','manageEmployees',true),('admin','deleteEmployees',true),('admin','changeRoles',true),('admin','resetPasswords',true),
  ('admin','viewTasks',true),('admin','manageTasks',true),('admin','viewTA',true),('admin','manageTA',true),
  ('admin','viewLiveTracking',true),('admin','viewReports',true),('admin','manageSettings',true),('admin','managePermissions',true),
  -- hr
  ('hr','manageEmployees',true),('hr','deleteEmployees',false),('hr','changeRoles',false),('hr','resetPasswords',true),
  ('hr','viewTasks',true),('hr','manageTasks',false),('hr','viewTA',true),('hr','manageTA',false),
  ('hr','viewLiveTracking',true),('hr','viewReports',true),('hr','manageSettings',false),('hr','managePermissions',false),
  -- dhr (view only)
  ('dhr','manageEmployees',false),('dhr','deleteEmployees',false),('dhr','changeRoles',false),('dhr','resetPasswords',false),
  ('dhr','viewTasks',true),('dhr','manageTasks',false),('dhr','viewTA',false),('dhr','manageTA',false),
  ('dhr','viewLiveTracking',false),('dhr','viewReports',true),('dhr','manageSettings',false),('dhr','managePermissions',false),
  -- field roles: no admin perms
  ('sr','manageEmployees',false),('sr','deleteEmployees',false),('sr','changeRoles',false),('sr','resetPasswords',false),
  ('sr','viewTasks',false),('sr','manageTasks',false),('sr','viewTA',false),('sr','manageTA',false),
  ('sr','viewLiveTracking',false),('sr','viewReports',false),('sr','manageSettings',false),('sr','managePermissions',false),
  ('fso','manageEmployees',false),('fso','deleteEmployees',false),('fso','changeRoles',false),('fso','resetPasswords',false),
  ('fso','viewTasks',false),('fso','manageTasks',false),('fso','viewTA',false),('fso','manageTA',false),
  ('fso','viewLiveTracking',false),('fso','viewReports',false),('fso','manageSettings',false),('fso','managePermissions',false),
  ('dsr','manageEmployees',false),('dsr','deleteEmployees',false),('dsr','changeRoles',false),('dsr','resetPasswords',false),
  ('dsr','viewTasks',false),('dsr','manageTasks',false),('dsr','viewTA',false),('dsr','manageTA',false),
  ('dsr','viewLiveTracking',false),('dsr','viewReports',false),('dsr','manageSettings',false),('dsr','managePermissions',false)
ON CONFLICT (role, permission) DO NOTHING;
