
-- 1. Add tier columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS tier_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS access_code_used text;

-- Auto-approve everyone now (whitelist is going away)
UPDATE public.profiles SET is_approved = true WHERE is_approved = false;

-- Update handle_new_user to auto-approve new signups on free tier
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_approved, tier)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    true,
    'free'
  );
  INSERT INTO public.streaks (user_id) VALUES (new.id);
  RETURN new;
END;
$function$;

-- 2. access_codes table
CREATE TABLE IF NOT EXISTS public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  duration_months integer NOT NULL CHECK (duration_months IN (1, 6, 12)),
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  used_by uuid,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Admins can do anything
CREATE POLICY "Admins can view all codes" ON public.access_codes
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert codes" ON public.access_codes
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update codes" ON public.access_codes
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete codes" ON public.access_codes
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Users can see codes they have used
CREATE POLICY "Users can view own used code" ON public.access_codes
  FOR SELECT USING (auth.uid() = used_by);

-- 3. Redeem function (security definer; bypasses RLS for the lookup)
CREATE OR REPLACE FUNCTION public.redeem_access_code(_code text)
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

-- 4. Admin generate codes function
CREATE OR REPLACE FUNCTION public.generate_access_codes(_count integer, _duration_months integer)
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
  IF NOT public.has_role(auth.uid(), 'admin') THEN
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
      -- try again
      NULL;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_access_code(text) FROM public;
GRANT EXECUTE ON FUNCTION public.redeem_access_code(text) TO authenticated;

REVOKE ALL ON FUNCTION public.generate_access_codes(integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.generate_access_codes(integer, integer) TO authenticated;
