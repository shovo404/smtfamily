
-- Location pings history
CREATE TABLE public.location_pings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy numeric,
  speed numeric,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX location_pings_user_time_idx ON public.location_pings (user_id, recorded_at DESC);

GRANT SELECT, INSERT ON public.location_pings TO authenticated;
GRANT ALL ON public.location_pings TO service_role;

ALTER TABLE public.location_pings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own pings" ON public.location_pings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users read own pings" ON public.location_pings
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read all pings" ON public.location_pings
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'dhr'));

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  message text,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_created_idx ON public.notifications (created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read notifications" ON public.notifications
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users insert notifications about self" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (actor_user_id = auth.uid());
CREATE POLICY "Admins update notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- Accuracy for current position
ALTER TABLE public.employee_locations ADD COLUMN IF NOT EXISTS accuracy numeric;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_pings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
