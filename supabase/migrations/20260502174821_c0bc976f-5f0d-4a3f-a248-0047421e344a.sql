
CREATE TABLE public.auth_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_user_id UUID,
  target_email TEXT,
  target_user_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view audit log"
ON public.auth_audit_log
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Anyone can log auth events"
ON public.auth_audit_log
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE INDEX idx_auth_audit_log_created_at ON public.auth_audit_log(created_at DESC);
CREATE INDEX idx_auth_audit_log_event_type ON public.auth_audit_log(event_type);
CREATE INDEX idx_auth_audit_log_target_email ON public.auth_audit_log(target_email);
