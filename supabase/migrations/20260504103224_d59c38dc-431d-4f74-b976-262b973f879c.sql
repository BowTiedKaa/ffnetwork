CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS "Admins can view all codes" ON public.access_codes;
CREATE POLICY "Admins can view all codes"
  ON public.access_codes FOR SELECT
  USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert codes" ON public.access_codes;
CREATE POLICY "Admins can insert codes"
  ON public.access_codes FOR INSERT
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update codes" ON public.access_codes;
CREATE POLICY "Admins can update codes"
  ON public.access_codes FOR UPDATE
  USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete codes" ON public.access_codes;
CREATE POLICY "Admins can delete codes"
  ON public.access_codes FOR DELETE
  USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (private.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION private.redeem_access_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _row public.access_codes%ROWTYPE;
  _expires timestamptz;
BEGIN
  IF _user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.');
  END IF;

  SELECT * INTO _row FROM public.access_codes WHERE code = upper(trim(_code));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code not found. Check your code and try again.');
  END IF;

  IF _row.is_active = false THEN
    RETURN jsonb_build_object('success', false, 'error', 'This code is no longer active.');
  END IF;

  IF _row.used_by IS NOT NULL AND _row.used_by <> _user THEN
    RETURN jsonb_build_object('success', false, 'error', 'This code has already been used.');
  END IF;

  _expires := now() + make_interval(months => _row.duration_months);

  UPDATE public.access_codes
    SET used_at = COALESCE(used_at, now()), used_by = _user
    WHERE id = _row.id;

  UPDATE public.profiles
    SET tier = 'pro',
        tier_expires_at = _expires,
        access_code_used = _row.code
    WHERE id = _user;

  RETURN jsonb_build_object('success', true, 'expires_at', _expires);
END;
$$;

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
  IF _duration_months NOT IN (1, 6, 12) THEN
    RAISE EXCEPTION 'Duration must be 1, 6, or 12 months';
  END IF;

  WHILE _i < _count LOOP
    _rand := '';
    FOR _j IN 1..6 LOOP
      _rand := _rand || substr(_alphabet, 1 + floor(random() * length(_alphabet))::int, 1);
    END LOOP;
    _code := 'FF-' || _year || '-' || _rand;
    BEGIN
      INSERT INTO public.access_codes (code, duration_months) VALUES (_code, _duration_months);
      _i := _i + 1;
      RETURN NEXT _code;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION private.redeem_access_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.generate_access_codes(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.redeem_access_code(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.generate_access_codes(integer, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.redeem_access_code(_code text)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT private.redeem_access_code(_code)
$$;

CREATE OR REPLACE FUNCTION public.generate_access_codes(_count integer, _duration_months integer)
RETURNS SETOF text
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT * FROM private.generate_access_codes(_count, _duration_months)
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.redeem_access_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_access_codes(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_access_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_access_codes(integer, integer) TO authenticated;