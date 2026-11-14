
-- ============================================================
-- Security fixes
-- ============================================================

-- 1. PROFILES: restrict SELECT to self + staff (prevent email/PII enumeration)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- 2. PROFILES: prevent self role escalation on INSERT and UPDATE
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'student'::user_role
);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role = (SELECT role FROM public.profiles WHERE user_id = auth.uid())
);

-- 3. ACCESS_CODES: remove public read; use SECURITY DEFINER verify function
DROP POLICY IF EXISTS "Anyone can verify codes" ON public.access_codes;

CREATE POLICY "Staff can view access codes"
ON public.access_codes FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.verify_access_code(
  code_to_verify text,
  expected_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    'year_group', code_record.year_group
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_access_code(text, text) TO anon, authenticated;

-- 4. HOMEPAGE_CONTENT: remove always-true UPDATE policy
DROP POLICY IF EXISTS "Librarian can edit homepage" ON public.homepage_content;
-- "Librarians can manage homepage content" (ALL with role check) remains in place.

-- 5. CHALLENGE_SUBMISSIONS: require authentication to read
DROP POLICY IF EXISTS "Anyone can read challenge submissions" ON public.challenge_submissions;

CREATE POLICY "Authenticated users can read challenge submissions"
ON public.challenge_submissions FOR SELECT
TO authenticated
USING (true);
