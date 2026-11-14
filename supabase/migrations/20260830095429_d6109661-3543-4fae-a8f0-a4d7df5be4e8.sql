CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.user_role;
  v_full_name text;
  v_year_group public.year_group;
  v_class text;
  v_house public.house_name;
  v_code text;
  v_code_record RECORD;
  v_expected_type text;
  v_admission text;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student'::public.user_role);
  v_code := upper(trim(COALESCE(NEW.raw_user_meta_data->>'access_code', '')));
  v_admission := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'admission_number','')), '');

  v_expected_type := CASE v_role::text
    WHEN 'student' THEN 'student'
    WHEN 'librarian' THEN 'librarian'
    ELSE 'tutor'
  END;

  IF v_code = '' THEN
    RAISE EXCEPTION 'Access code is required';
  END IF;

  SELECT * INTO v_code_record
  FROM public.access_codes
  WHERE code = v_code AND is_active = true AND code_type = v_expected_type;

  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid access code for this role'; END IF;
  IF v_code_record.expires_at IS NOT NULL AND v_code_record.expires_at < now() THEN RAISE EXCEPTION 'Access code expired'; END IF;
  IF v_code_record.max_uses IS NOT NULL AND v_code_record.current_uses >= v_code_record.max_uses THEN RAISE EXCEPTION 'Access code usage limit reached'; END IF;

  IF v_role = 'student' THEN
    v_year_group := NULLIF(NEW.raw_user_meta_data->>'year_group','')::public.year_group;
    v_class := NULLIF(NEW.raw_user_meta_data->>'class_name','');
    v_house := NULLIF(NEW.raw_user_meta_data->>'house','')::public.house_name;

    IF v_code_record.year_group IS NOT NULL
       AND upper(v_code_record.year_group) <> upper(COALESCE(v_year_group::text,'')) THEN
      RAISE EXCEPTION 'This access code is only valid for % students', v_code_record.year_group;
    END IF;
    IF v_code_record.house IS NOT NULL
       AND lower(v_code_record.house) <> lower(COALESCE(v_house::text,'')) THEN
      RAISE EXCEPTION 'This access code is only valid for % house', v_code_record.house;
    END IF;
    IF v_code_record.class_name IS NOT NULL
       AND lower(v_code_record.class_name) <> lower(COALESCE(v_class,'')) THEN
      RAISE EXCEPTION 'This access code is only valid for class %', v_code_record.class_name;
    END IF;
  ELSE
    IF v_code_record.role_restriction IS NOT NULL
       AND v_code_record.role_restriction <> v_role::text THEN
      RAISE EXCEPTION 'This access code is only valid for the % role', v_code_record.role_restriction;
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, email, role, year_group, class_name, house, admission_number)
  VALUES (NEW.id, v_full_name, NEW.email, v_role, v_year_group, v_class, v_house, v_admission);

  UPDATE public.access_codes SET current_uses = current_uses + 1 WHERE id = v_code_record.id;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_access_code(code_to_verify text, expected_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  code_record RECORD;
BEGIN
  SELECT * INTO code_record
  FROM public.access_codes
  WHERE code = upper(trim(code_to_verify))
    AND is_active = true
    AND code_type = expected_type;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Invalid code');
  END IF;

  IF code_record.expires_at IS NOT NULL AND code_record.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Code expired');
  END IF;

  IF code_record.max_uses IS NOT NULL
     AND code_record.current_uses >= code_record.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Usage limit reached');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'code_id', code_record.id,
    'school_name', code_record.school_name,
    'house', code_record.house,
    'class_name', code_record.class_name,
    'year_group', code_record.year_group,
    'role_restriction', code_record.role_restriction
  );
END;
$function$;