-- Trigger function: should not be callable by anyone
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Used only inside RLS policies / SECURITY DEFINER context — internal
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon, authenticated;

-- User-facing RPCs: keep authenticated, drop anon
REVOKE EXECUTE ON FUNCTION public.redeem_access_code(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_access_codes(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_access_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_access_codes(integer, integer) TO authenticated;