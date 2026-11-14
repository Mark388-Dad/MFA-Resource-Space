
REVOKE EXECUTE ON FUNCTION public.has_chat_restriction(uuid, text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.touch_chat_presence(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.conversation_receipts(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_conversation(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.start_direct_conversation(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_my_conversations() FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_directory(text) FROM anon;
