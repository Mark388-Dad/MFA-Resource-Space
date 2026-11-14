
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admission_number text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_admission_number_unique ON public.profiles (admission_number) WHERE admission_number IS NOT NULL;

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
  END IF;

  INSERT INTO public.profiles (user_id, full_name, email, role, year_group, class_name, house, admission_number)
  VALUES (NEW.id, v_full_name, NEW.email, v_role, v_year_group, v_class, v_house, v_admission);

  UPDATE public.access_codes SET current_uses = current_uses + 1 WHERE id = v_code_record.id;

  RETURN NEW;
END;
$function$;
