-- Helper: get the current code-based expiry for a user (NULL if no active code-based access)
CREATE OR REPLACE FUNCTION public.get_code_expiry(_user_id uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tier_expires_at
  FROM public.profiles
  WHERE id = _user_id
    AND access_code_used IS NOT NULL
    AND tier_expires_at IS NOT NULL
    AND tier_expires_at > now()
$$;

-- Apply Pro entitlement, taking the later of the new expiry and any active code expiry
CREATE OR REPLACE FUNCTION public.apply_pro_entitlement(
  _user_id uuid,
  _sub_expires_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code_expiry timestamptz;
  _final_expiry timestamptz;
BEGIN
  SELECT public.get_code_expiry(_user_id) INTO _code_expiry;

  -- Take the later of the two expiries (NULL sub_expires_at means perpetual; not used today)
  IF _sub_expires_at IS NULL THEN
    _final_expiry := _code_expiry;
  ELSIF _code_expiry IS NULL THEN
    _final_expiry := _sub_expires_at;
  ELSE
    _final_expiry := GREATEST(_sub_expires_at, _code_expiry);
  END IF;

  UPDATE public.profiles
  SET tier = 'pro',
      tier_expires_at = _final_expiry
  WHERE id = _user_id;
END;
$$;

-- Downgrade only if no active code grants Pro
CREATE OR REPLACE FUNCTION public.downgrade_if_no_code(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code_expiry timestamptz;
BEGIN
  SELECT public.get_code_expiry(_user_id) INTO _code_expiry;
  IF _code_expiry IS NOT NULL THEN
    -- User still has Pro via code; keep them Pro until code expires
    UPDATE public.profiles
    SET tier = 'pro', tier_expires_at = _code_expiry
    WHERE id = _user_id;
  ELSE
    UPDATE public.profiles
    SET tier = 'free', tier_expires_at = NULL
    WHERE id = _user_id;
  END IF;
END;
$$;