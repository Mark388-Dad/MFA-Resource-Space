
-- 1. Recreate views without SECURITY DEFINER (use security_invoker)
ALTER VIEW public.student_progress SET (security_invoker = true);
ALTER VIEW public.house_leaderboard SET (security_invoker = true);

-- 2. Tighten overly permissive INSERT policy on auth_audit_log
DROP POLICY IF EXISTS "Anyone can log auth events" ON public.auth_audit_log;
CREATE POLICY "Auth events can be logged" ON public.auth_audit_log
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    event_type IN (
      'password_reset_requested',
      'password_reset_completed',
      'verification_resend_requested',
      'sign_in_failed',
      'sign_up'
    )
    AND (target_email IS NULL OR length(target_email) <= 255)
  );

-- 3. Drop broad SELECT-listing policies on public storage buckets
-- (Public buckets remain accessible via direct public URLs; this prevents listing all files.)
DROP POLICY IF EXISTS "Anyone can view certificate assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view public librarian files" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

-- 4. Revoke EXECUTE on SECURITY DEFINER functions from anon (keep authenticated)
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_reading_streak() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.verify_access_code(text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_access_code(text, text) TO authenticated;
