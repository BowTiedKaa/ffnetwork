ALTER TABLE public.access_codes
DROP CONSTRAINT IF EXISTS access_codes_duration_months_check;

ALTER TABLE public.access_codes
ADD CONSTRAINT access_codes_duration_months_check
CHECK (duration_months IN (1, 6, 12, 36));

CREATE OR REPLACE FUNCTION private.generate_access_codes(_count integer, _duration_months integer)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _i integer := 0;
  _code text;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF _count < 1 OR _count > 50 THEN
    RAISE EXCEPTION 'Count must be between 1 and 50';
  END IF;

  IF _duration_months NOT IN (1, 6, 12, 36) THEN
    RAISE EXCEPTION 'Duration must be 1, 6, 12, or 36 months';
  END IF;

  WHILE _i < _count LOOP
    _code := 'FF-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));
    BEGIN
      INSERT INTO public.access_codes (code, duration_months)
      VALUES (_code, _duration_months);
      _i := _i + 1;
      RETURN NEXT _code;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;

  RETURN;
END;
$$;