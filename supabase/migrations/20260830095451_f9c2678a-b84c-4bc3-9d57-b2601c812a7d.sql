ALTER TABLE public.access_codes DROP CONSTRAINT IF EXISTS access_codes_code_type_check;
ALTER TABLE public.access_codes ADD CONSTRAINT access_codes_code_type_check
  CHECK (code_type = ANY (ARRAY['librarian'::text, 'student'::text, 'tutor'::text]));