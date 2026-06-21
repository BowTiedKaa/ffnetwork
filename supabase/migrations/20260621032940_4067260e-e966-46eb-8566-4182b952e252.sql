
REVOKE EXECUTE ON FUNCTION public.compute_visitor_archetype(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_visitor_archetype() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_visitor_archetype() FROM PUBLIC, anon, authenticated;
