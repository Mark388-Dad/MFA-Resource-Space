
DROP POLICY IF EXISTS "Auth events can be logged" ON public.auth_audit_log;
CREATE POLICY "Auth events can be logged"
ON public.auth_audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  (event_type = ANY (ARRAY['password_reset_requested'::text, 'password_reset_completed'::text, 'verification_resend_requested'::text, 'sign_in_failed'::text, 'sign_up'::text]))
  AND ((target_email IS NULL) OR (length(target_email) <= 255))
);

DROP POLICY IF EXISTS "Users can view all streaks" ON public.reading_streaks;
CREATE POLICY "Authenticated users can view streaks"
ON public.reading_streaks
FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.reading_streaks FROM anon;
