CREATE OR REPLACE FUNCTION private.generate_access_codes(_count integer, _duration_months integer)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _i integer := 0;
  _code text;
  _year text := to_char(now(), 'YYYY');
  _alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  _rand text;
  _j integer;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admins only';
  END IF;
  IF _count < 1 OR _count > 50 THEN
    RAISE EXCEPTION 'Count must be 1-50';
  END IF;
  IF _duration_months NOT IN (1, 6, 12, 36) THEN
    RAISE EXCEPTION 'Duration must be 1, 6, 12, or 36 months';
  END IF;

  WHILE _i < _count LOOP
    _rand := '';
    FOR _j IN 1..6 LOOP
      _rand := _rand || substr(_alphabet, 1 + floor(random() * length(_alphabet))::int, 1);
    END LOOP;
    _code := 'FF-' || _year || '-' || _rand;
    BEGIN
      INSERT INTO public.access_codes (code, duration_months) VALUES (_code, _duration_months);
      RETURN NEXT _code;
      _i := _i + 1;
    EXCEPTION WHEN unique_violation THEN
      -- retry on collision
      NULL;
    END;
  END LOOP;
END;
$$;