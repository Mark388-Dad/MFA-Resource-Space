
ALTER TABLE public.chat_messages ADD COLUMN sender_name text;

CREATE OR REPLACE FUNCTION public.set_chat_sender_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_name IS NULL THEN
    SELECT full_name INTO NEW.sender_name FROM public.profiles WHERE user_id = NEW.sender_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER chat_messages_sender_name
BEFORE INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.set_chat_sender_name();

CREATE OR REPLACE FUNCTION public.list_my_conversations()
RETURNS TABLE (
  id uuid,
  kind text,
  title text,
  scope_kind text,
  scope_value text,
  other_user_id uuid,
  last_message text,
  last_message_at timestamptz,
  unread_count integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.kind,
    COALESCE(c.title, op.full_name, 'Direct chat') AS title,
    c.scope_kind,
    c.scope_value,
    op.user_id AS other_user_id,
    lm.body AS last_message,
    lm.created_at AS last_message_at,
    COALESCE((
      SELECT count(*) FROM public.chat_messages m2
      WHERE m2.conversation_id = c.id
        AND m2.sender_id <> auth.uid()
        AND m2.created_at > COALESCE((
          SELECT cp.last_read_at FROM public.chat_participants cp
          WHERE cp.conversation_id = c.id AND cp.user_id = auth.uid()
        ), 'epoch'::timestamptz)
    ), 0)::integer AS unread_count
  FROM public.chat_conversations c
  LEFT JOIN LATERAL (
    SELECT p.user_id, p.full_name
    FROM public.chat_participants cp
    JOIN public.profiles p ON p.user_id = cp.user_id
    WHERE cp.conversation_id = c.id AND cp.user_id <> auth.uid()
    LIMIT 1
  ) op ON c.kind = 'direct'
  LEFT JOIN LATERAL (
    SELECT m.body, m.created_at FROM public.chat_messages m
    WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1
  ) lm ON true
  WHERE auth.uid() IS NOT NULL AND public.can_access_conversation(c.id, auth.uid())
  ORDER BY lm.created_at DESC NULLS LAST, 3;
$$;

REVOKE EXECUTE ON FUNCTION public.list_my_conversations() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.list_my_conversations() TO authenticated;
