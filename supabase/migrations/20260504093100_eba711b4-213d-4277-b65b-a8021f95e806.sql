REVOKE EXECUTE ON FUNCTION public.get_code_expiry(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_pro_entitlement(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.downgrade_if_no_code(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_code_expiry(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_pro_entitlement(uuid, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.downgrade_if_no_code(uuid) TO service_role;