-- 1) Profile self-upgrade protection via trigger
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF auth.uid() IS NULL OR private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  NEW.is_approved     := OLD.is_approved;
  NEW.tier            := OLD.tier;
  NEW.tier_expires_at := OLD.tier_expires_at;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 2) Drop residual public.has_role to avoid any schema-resolution ambiguity
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 3) Pin search_path on helper SECURITY DEFINER functions
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;