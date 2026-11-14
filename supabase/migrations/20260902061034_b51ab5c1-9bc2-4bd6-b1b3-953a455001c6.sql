
-- 1. Message enhancements
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS attachment_size integer,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

ALTER TABLE public.chat_messages ALTER COLUMN body DROP NOT NULL;

-- 2. Receipts
ALTER TABLE public.chat_participants
  ADD COLUMN IF NOT EXISTS last_delivered_at timestamptz NOT NULL DEFAULT 'epoch'::timestamptz,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

-- 3. Restrictions
CREATE TABLE IF NOT EXISTS public.chat_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('mute','read_only','no_attachments','no_dm','shadowban','ban')),
  reason text,
  conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_restrictions TO authenticated;
GRANT ALL ON public.chat_restrictions TO service_role;
ALTER TABLE public.chat_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own or staff restrictions" ON public.chat_restrictions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "staff manage restrictions" ON public.chat_restrictions
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER update_chat_restrictions_updated_at
  BEFORE UPDATE ON public.chat_restrictions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_chat_restrictions_user ON public.chat_restrictions(user_id) WHERE is_active;

-- 4. Moderation log
CREATE TABLE IF NOT EXISTS public.chat_moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  moderator_id uuid NOT NULL,
  target_user_id uuid,
  message_id uuid,
  conversation_id uuid,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.chat_moderation_log TO authenticated;
GRANT ALL ON public.chat_moderation_log TO service_role;
ALTER TABLE public.chat_moderation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read moderation log" ON public.chat_moderation_log
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write moderation log" ON public.chat_moderation_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND moderator_id = auth.uid());

-- 5. Helper: is a user currently restricted by a given kind?
CREATE OR REPLACE FUNCTION public.has_chat_restriction(_user_id uuid, _kinds text[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_restrictions r
    WHERE r.user_id = _user_id
      AND r.is_active
      AND r.kind = ANY(_kinds)
      AND (r.expires_at IS NULL OR r.expires_at > now())
  )
$$;

-- 6. Message policies: block restricted senders, allow staff moderation
DROP POLICY IF EXISTS "send messages in accessible conversations" ON public.chat_messages;
CREATE POLICY "send messages in accessible conversations" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.can_access_conversation(conversation_id, auth.uid())
    AND NOT public.has_chat_restriction(auth.uid(), ARRAY['mute','read_only','ban'])
  );

DROP POLICY IF EXISTS "delete own messages" ON public.chat_messages;
CREATE POLICY "delete own or any message as staff" ON public.chat_messages
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "edit own or moderate any message" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (sender_id = auth.uid() OR public.is_staff(auth.uid()));

-- 7. Mark delivered/read helper
CREATE OR REPLACE FUNCTION public.touch_chat_presence(_conversation_id uuid, _read boolean DEFAULT false)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.chat_participants
  SET last_delivered_at = now(),
      last_seen_at = now(),
      last_read_at = CASE WHEN _read THEN now() ELSE last_read_at END
  WHERE conversation_id = _conversation_id AND user_id = auth.uid();
$$;

-- 8. Receipt status for my sent messages in a conversation
CREATE OR REPLACE FUNCTION public.conversation_receipts(_conversation_id uuid)
RETURNS TABLE(min_delivered_at timestamptz, min_read_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT max(cp.last_delivered_at), max(cp.last_read_at)
  FROM public.chat_participants cp
  WHERE cp.conversation_id = _conversation_id
    AND cp.user_id <> auth.uid()
    AND public.can_access_conversation(_conversation_id, auth.uid())
$$;

-- 9. Hide shadowbanned / hidden messages from non-staff, non-authors
DROP POLICY IF EXISTS "read messages in accessible conversations" ON public.chat_messages;
CREATE POLICY "read messages in accessible conversations" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    public.can_access_conversation(conversation_id, auth.uid())
    AND (
      NOT is_hidden
      OR sender_id = auth.uid()
      OR public.is_staff(auth.uid())
    )
  );

-- 10. Storage policies for chat attachments + avatars
CREATE POLICY "chat attachments readable by authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments');
CREATE POLICY "users upload own chat attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND NOT public.has_chat_restriction(auth.uid(), ARRAY['no_attachments','mute','ban'])
  );
CREATE POLICY "users delete own chat attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-attachments' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff(auth.uid())));

CREATE POLICY "avatars public read"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "users manage own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
