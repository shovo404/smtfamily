-- =====================================================================
-- SMT Family — Full Supabase Schema (consolidated)
-- Run this ONCE on a fresh Supabase project (SQL Editor → New Query → Run)
-- =====================================================================

-- ---------- ENUMS ----------
CREATE TYPE public.app_role AS ENUM ('admin','hr','dhr','sr','fso');
CREATE TYPE public.task_status AS ENUM ('pending','in_progress','completed','overdue');
CREATE TYPE public.ta_status  AS ENUM ('pending','approved','rejected');

-- ---------- HELPER: updated_at ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =====================================================================
-- PROFILES
-- =====================================================================
CREATE TABLE public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id  TEXT UNIQUE,
  full_name    TEXT NOT NULL DEFAULT '',
  email        TEXT,
  phone        TEXT,
  department   TEXT,
  photo_url    TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- USER ROLES  (roles kept in a SEPARATE table — required for security)
-- =====================================================================
CREATE TABLE public.user_roles (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role    public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ---------- SECURITY DEFINER ROLE CHECKS ----------
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','hr'));
$$;

-- ---------- POLICIES: profiles ----------
CREATE POLICY "Users view own profile"    ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles"  ON public.profiles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Self insert profile"       ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins manage profiles"    ON public.profiles FOR ALL    TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ---------- POLICIES: user_roles ----------
CREATE POLICY "Users see own roles"    ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins see all roles"   ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage roles"    ON public.user_roles FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ---------- AUTO CREATE PROFILE + ROLE ON SIGNUP ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  -- First user becomes admin, all subsequent = sr
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'sr');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- TASKS
-- =====================================================================
CREATE TABLE public.tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  assigned_to  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status       public.task_status NOT NULL DEFAULT 'pending',
  due_date     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees see own tasks"         ON public.tasks FOR SELECT TO authenticated USING (assigned_to = auth.uid());
CREATE POLICY "Admins see all tasks"            ON public.tasks FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Employees update own task status" ON public.tasks FOR UPDATE TO authenticated USING (assigned_to = auth.uid());
CREATE POLICY "Admins manage tasks"             ON public.tasks FOR ALL    TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- ATTENDANCE  (face + GPS)
-- =====================================================================
CREATE TABLE public.attendance (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_date                 DATE NOT NULL DEFAULT (now()::date),
  check_in                  TIMESTAMPTZ,
  check_out                 TIMESTAMPTZ,
  check_in_lat              DOUBLE PRECISION,
  check_in_lng              DOUBLE PRECISION,
  check_out_lat             DOUBLE PRECISION,
  check_out_lng             DOUBLE PRECISION,
  check_in_photo_url        TEXT,
  check_out_photo_url       TEXT,
  check_in_face_verified    BOOLEAN NOT NULL DEFAULT false,
  check_out_face_verified   BOOLEAN NOT NULL DEFAULT false,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, work_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own attendance"     ON public.attendance FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins see all attendance"    ON public.attendance FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users insert own attendance"  ON public.attendance FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own attendance"  ON public.attendance FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins update any attendance" ON public.attendance FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- =====================================================================
-- TA REQUESTS
-- =====================================================================
CREATE TABLE public.ta_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_location     TEXT NOT NULL,
  to_location       TEXT NOT NULL,
  travel_date       DATE NOT NULL,
  purpose           TEXT,
  distance_km       NUMERIC,
  transport_type    TEXT,
  requested_amount  NUMERIC NOT NULL DEFAULT 0,
  approved_amount   NUMERIC,
  remarks           TEXT,
  admin_note        TEXT,
  status            public.ta_status NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ta_requests TO authenticated;
GRANT ALL ON public.ta_requests TO service_role;
ALTER TABLE public.ta_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own TA"           ON public.ta_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins see all TA"          ON public.ta_requests FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users create own TA"        ON public.ta_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own pending TA" ON public.ta_requests FOR UPDATE TO authenticated USING (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Admins manage TA"           ON public.ta_requests FOR ALL    TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER ta_updated_at BEFORE UPDATE ON public.ta_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- LIVE LOCATION (current position per user)
-- =====================================================================
CREATE TABLE public.employee_locations (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude    DOUBLE PRECISION NOT NULL,
  longitude   DOUBLE PRECISION NOT NULL,
  accuracy    NUMERIC,
  speed       NUMERIC,
  duty_on     BOOLEAN NOT NULL DEFAULT false,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_locations TO authenticated;
GRANT ALL ON public.employee_locations TO service_role;
ALTER TABLE public.employee_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own location"    ON public.employee_locations FOR ALL    TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins view all locations"    ON public.employee_locations FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'dhr'));

-- =====================================================================
-- LOCATION PING HISTORY (full path)
-- =====================================================================
CREATE TABLE public.location_pings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude     DOUBLE PRECISION NOT NULL,
  longitude    DOUBLE PRECISION NOT NULL,
  accuracy     NUMERIC,
  speed        NUMERIC,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX location_pings_user_time_idx ON public.location_pings (user_id, recorded_at DESC);
GRANT SELECT, INSERT ON public.location_pings TO authenticated;
GRANT ALL ON public.location_pings TO service_role;
ALTER TABLE public.location_pings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own pings" ON public.location_pings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users read own pings"   ON public.location_pings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read all pings"  ON public.location_pings FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'dhr'));

-- =====================================================================
-- NOTIFICATIONS (location off alerts etc.)
-- =====================================================================
CREATE TABLE public.notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type           TEXT NOT NULL,
  title          TEXT NOT NULL,
  message        TEXT,
  actor_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  meta           JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read        BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_created_idx ON public.notifications (created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read notifications"           ON public.notifications FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users insert notifications about self" ON public.notifications FOR INSERT TO authenticated WITH CHECK (actor_user_id = auth.uid());
CREATE POLICY "Admins update notifications"         ON public.notifications FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- =====================================================================
-- ROLE PERMISSIONS (dynamic permission matrix)
-- =====================================================================
CREATE TABLE public.role_permissions (
  role        public.app_role NOT NULL,
  permission  TEXT NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role, permission)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can modify permissions"         ON public.role_permissions FOR ALL    TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.role_permissions (role, permission, enabled) VALUES
  ('admin','manageEmployees',true),('admin','deleteEmployees',true),('admin','changeRoles',true),('admin','resetPasswords',true),
  ('admin','viewTasks',true),('admin','manageTasks',true),('admin','viewTA',true),('admin','manageTA',true),
  ('admin','viewLiveTracking',true),('admin','viewReports',true),('admin','manageSettings',true),('admin','managePermissions',true),
  ('hr','manageEmployees',true),('hr','deleteEmployees',false),('hr','changeRoles',false),('hr','resetPasswords',true),
  ('hr','viewTasks',true),('hr','manageTasks',false),('hr','viewTA',true),('hr','manageTA',false),
  ('hr','viewLiveTracking',true),('hr','viewReports',true),('hr','manageSettings',false),('hr','managePermissions',false),
  ('dhr','manageEmployees',false),('dhr','deleteEmployees',false),('dhr','changeRoles',false),('dhr','resetPasswords',false),
  ('dhr','viewTasks',true),('dhr','manageTasks',false),('dhr','viewTA',false),('dhr','manageTA',false),
  ('dhr','viewLiveTracking',false),('dhr','viewReports',true),('dhr','manageSettings',false),('dhr','managePermissions',false),
  ('sr','manageEmployees',false),('sr','deleteEmployees',false),('sr','changeRoles',false),('sr','resetPasswords',false),
  ('sr','viewTasks',false),('sr','manageTasks',false),('sr','viewTA',false),('sr','manageTA',false),
  ('sr','viewLiveTracking',false),('sr','viewReports',false),('sr','manageSettings',false),('sr','managePermissions',false),
  ('fso','manageEmployees',false),('fso','deleteEmployees',false),('fso','changeRoles',false),('fso','resetPasswords',false),
  ('fso','viewTasks',false),('fso','manageTasks',false),('fso','viewTA',false),('fso','manageTA',false),
  ('fso','viewLiveTracking',false),('fso','viewReports',false),('fso','manageSettings',false),('fso','managePermissions',false)
ON CONFLICT (role, permission) DO NOTHING;

-- =====================================================================
-- APP SETTINGS (office hours etc.)
-- =====================================================================
CREATE TABLE public.app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID
);
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read app_settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage app_settings"      ON public.app_settings FOR ALL    TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.app_settings(key, value) VALUES
  ('office_hours', '{"start":"09:00","end":"18:00"}'::jsonb),
  ('app_logo', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- =====================================================================
-- STORAGE BUCKET: attendance-faces  (private)
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-faces', 'attendance-faces', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "attendance faces: user upload own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attendance-faces' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "attendance faces: user read own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'attendance-faces' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "attendance faces: admins read all"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'attendance-faces' AND public.is_admin(auth.uid()));

-- =====================================================================
-- STORAGE BUCKET: profile-photos  (public)
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "profile photos: authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-photos');

CREATE POLICY "profile photos: authenticated update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "profile photos: authenticated delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- REALTIME
-- =====================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_pings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =====================================================================
-- FUNCTION HARDENING
-- =====================================================================
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- DONE ✅
