CREATE OR REPLACE FUNCTION public.chat_avatars(_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.user_id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND p.user_id = ANY(_ids)
$$;

REVOKE ALL ON FUNCTION public.chat_avatars(uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.chat_avatars(uuid[]) TO authenticated;