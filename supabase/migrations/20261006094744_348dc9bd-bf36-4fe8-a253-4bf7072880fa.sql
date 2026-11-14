CREATE OR REPLACE FUNCTION public.join_challenge_with_code(_code text, _challenge_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  p RECORD; c RECORD;
  v_code text := upper(trim(coalesce(_code,'')));
  v_type text;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok',false,'message','Please sign in first'); END IF;
  IF v_code = '' THEN RETURN jsonb_build_object('ok',false,'message','Please enter an access code'); END IF;
  SELECT * INTO p FROM profiles WHERE user_id = v_uid;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'message','Profile not found'); END IF;
  IF NOT EXISTS (SELECT 1 FROM challenges WHERE id = _challenge_id) THEN
    RETURN jsonb_build_object('ok',false,'message','Challenge not found'); END IF;
  IF EXISTS (SELECT 1 FROM challenge_participants WHERE challenge_id=_challenge_id AND user_id=v_uid) THEN
    RETURN jsonb_build_object('ok',true,'message','Already registered'); END IF;

  v_type := CASE p.role::text WHEN 'student' THEN 'student' WHEN 'librarian' THEN 'librarian' ELSE 'tutor' END;
  SELECT * INTO c FROM access_codes WHERE code = v_code AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'message','Invalid or inactive access code'); END IF;
  IF c.code_type <> v_type AND NOT (v_type = 'librarian' AND c.code_type = 'tutor') THEN
    RETURN jsonb_build_object('ok',false,'message',
      CASE WHEN c.code_type='student' THEN 'This code is for students only' ELSE 'This code is for staff only' END);
  END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN RETURN jsonb_build_object('ok',false,'message','This code has expired'); END IF;
  IF c.max_uses IS NOT NULL AND c.current_uses >= c.max_uses THEN RETURN jsonb_build_object('ok',false,'message','This code has reached its usage limit'); END IF;
  IF c.house IS NOT NULL AND lower(c.house) <> lower(coalesce(p.house::text,'')) THEN
    RETURN jsonb_build_object('ok',false,'message','This code is only for '||c.house||' house'); END IF;
  IF c.year_group IS NOT NULL AND upper(c.year_group) <> upper(coalesce(p.year_group::text,'')) THEN
    RETURN jsonb_build_object('ok',false,'message','This code is only for '||c.year_group); END IF;
  IF c.class_name IS NOT NULL AND lower(c.class_name) <> lower(coalesce(p.class_name,'')) THEN
    RETURN jsonb_build_object('ok',false,'message','This code is only for class '||c.class_name); END IF;
  IF p.role::text <> 'student' AND c.role_restriction IS NOT NULL AND c.role_restriction NOT IN ('staff','all', p.role::text) THEN
    RETURN jsonb_build_object('ok',false,'message','This code is for the '||c.role_restriction||' role'); END IF;

  INSERT INTO challenge_participants (challenge_id, user_id) VALUES (_challenge_id, v_uid) ON CONFLICT DO NOTHING;
  UPDATE access_codes SET current_uses = coalesce(current_uses,0) + 1 WHERE id = c.id;
  INSERT INTO auth_audit_log (event_type, actor_user_id, target_user_id, metadata)
    VALUES ('challenge_joined', v_uid, v_uid, jsonb_build_object('challenge_id',_challenge_id,'code',v_code));
  RETURN jsonb_build_object('ok',true,'message','Registered');
END $$;
REVOKE EXECUTE ON FUNCTION public.join_challenge_with_code(text, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.join_challenge_with_code(text, uuid) TO authenticated;

-- Joining now always goes through a code check
DROP POLICY IF EXISTS "Students can join challenges" ON public.challenge_participants;
CREATE POLICY "Librarians can enroll participants" ON public.challenge_participants FOR INSERT TO authenticated
  WITH CHECK (get_user_role(auth.uid()) IN ('librarian','staff'));

-- Students cannot change their own class, year group, house or admission number
CREATE OR REPLACE FUNCTION public.lock_student_academic_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_staff(auth.uid()) THEN
    IF NEW.year_group IS DISTINCT FROM OLD.year_group
       OR NEW.class_name IS DISTINCT FROM OLD.class_name
       OR NEW.house IS DISTINCT FROM OLD.house
       OR NEW.admission_number IS DISTINCT FROM OLD.admission_number THEN
      RAISE EXCEPTION 'Only staff can change class, year group, house or admission number';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER lock_student_academic_fields BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.lock_student_academic_fields();