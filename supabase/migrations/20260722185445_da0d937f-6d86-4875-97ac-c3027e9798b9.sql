DROP POLICY IF EXISTS "Users insert notifications about self" ON public.notifications;

CREATE POLICY "Users insert own location_off notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  actor_user_id = auth.uid()
  AND type = 'location_off'
  AND length(coalesce(title, '')) <= 200
  AND length(coalesce(message, '')) <= 1000
);