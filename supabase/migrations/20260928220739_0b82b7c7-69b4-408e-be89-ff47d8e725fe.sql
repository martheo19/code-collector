
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.random_rarity() FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.random_rarity() SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.open_booster() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_listing(UUID, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_listing(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.buy_listing(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_booster() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_listing(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_listing(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buy_listing(UUID) TO authenticated;
