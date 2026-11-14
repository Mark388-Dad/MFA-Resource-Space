
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('direct','group')),
  title text,
  scope_kind text CHECK (scope_kind IN ('all','house','year','class')),
  scope_value text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.chat_conversations TO authenticated;
GRANT ALL ON public.chat_conversations TO service_role;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_participants TO authenticated;
GRANT ALL ON public.chat_participants TO service_role;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_conv_idx ON public.chat_messages (conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_conversation(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.conversation_id = _conversation_id AND cp.user_id = _user_id
  ) OR EXISTS (
    SELECT 1
    FROM public.chat_conversations c
    JOIN public.profiles p ON p.user_id = _user_id
    WHERE c.id = _conversation_id
      AND c.kind = 'group'
      AND (
        c.scope_kind = 'all'
        OR (c.scope_kind = 'house' AND lower(c.scope_value) = lower(COALESCE(p.house::text,'')))
        OR (c.scope_kind = 'year'  AND lower(c.scope_value) = lower(COALESCE(p.year_group::text,'')))
        OR (c.scope_kind = 'class' AND lower(c.scope_value) = lower(COALESCE(p.year_group::text,'') || ' ' || COALESCE(p.class_name,'')))
      )
  )
$$;

CREATE POLICY "read accessible conversations" ON public.chat_conversations
FOR SELECT TO authenticated
USING (public.can_access_conversation(id, auth.uid()));

CREATE POLICY "create conversations" ON public.chat_conversations
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "read own participation" ON public.chat_participants
FOR SELECT TO authenticated
USING (public.can_access_conversation(conversation_id, auth.uid()));

CREATE POLICY "add participants to own conversations" ON public.chat_participants
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid())
  OR user_id = auth.uid()
);

CREATE POLICY "update own participation" ON public.chat_participants
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "read messages in accessible conversations" ON public.chat_messages
FOR SELECT TO authenticated
USING (public.can_access_conversation(conversation_id, auth.uid()));

CREATE POLICY "send messages in accessible conversations" ON public.chat_messages
FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.can_access_conversation(conversation_id, auth.uid()));

CREATE POLICY "delete own messages" ON public.chat_messages
FOR DELETE TO authenticated
USING (sender_id = auth.uid());

CREATE TRIGGER update_chat_conversations_updated_at
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;

-- Directory search (safe, limited columns) so users can find each other by name or email
CREATE OR REPLACE FUNCTION public.search_directory(q text)
RETURNS TABLE (user_id uuid, full_name text, email text, role text, house text, year_group text, class_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.email, p.role::text, p.house::text, p.year_group::text, p.class_name
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.user_id <> auth.uid()
    AND (
      COALESCE(q,'') = ''
      OR p.email ILIKE '%' || q || '%'
      OR p.full_name ILIKE '%' || q || '%'
    )
  ORDER BY p.full_name
  LIMIT 30
$$;

-- Find or create a direct conversation between the current user and another user
CREATE OR REPLACE FUNCTION public.start_direct_conversation(_other_user uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _other_user = v_me THEN RAISE EXCEPTION 'Cannot chat with yourself'; END IF;

  SELECT c.id INTO v_id
  FROM public.chat_conversations c
  JOIN public.chat_participants a ON a.conversation_id = c.id AND a.user_id = v_me
  JOIN public.chat_participants b ON b.conversation_id = c.id AND b.user_id = _other_user
  WHERE c.kind = 'direct'
  LIMIT 1;

  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO public.chat_conversations (kind, created_by) VALUES ('direct', v_me) RETURNING id INTO v_id;
  INSERT INTO public.chat_participants (conversation_id, user_id) VALUES (v_id, v_me), (v_id, _other_user);
  RETURN v_id;
END;
$$;

-- Group conversations available to everyone / per house / per year / per class
INSERT INTO public.chat_conversations (kind, title, scope_kind, scope_value)
VALUES ('group', 'Whole School', 'all', NULL);

INSERT INTO public.chat_conversations (kind, title, scope_kind, scope_value)
SELECT 'group', h || ' House', 'house', h FROM unnest(ARRAY['Kenya','Longonot','Kilimanjaro','Elgon']) h;

INSERT INTO public.chat_conversations (kind, title, scope_kind, scope_value)
SELECT 'group', y || ' Year Group', 'year', y FROM unnest(ARRAY['DP2','DP1','G10']) y;

INSERT INTO public.chat_conversations (kind, title, scope_kind, scope_value)
SELECT DISTINCT 'group', (p.year_group::text || ' ' || p.class_name), 'class', (p.year_group::text || ' ' || p.class_name)
FROM public.profiles p
WHERE p.year_group IS NOT NULL AND p.class_name IS NOT NULL;
