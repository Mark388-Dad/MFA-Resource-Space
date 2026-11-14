
REVOKE EXECUTE ON FUNCTION public.search_directory(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.start_direct_conversation(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_access_conversation(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.search_directory(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_direct_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_conversation(uuid, uuid) TO authenticated;
