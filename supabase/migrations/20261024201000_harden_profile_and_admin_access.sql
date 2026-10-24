-- Keep public player names available without exposing private profile fields.
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

REVOKE ALL ON public.profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (username) ON public.profiles TO authenticated;

CREATE OR REPLACE VIEW public.public_profiles AS
  SELECT id, username
  FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.prevent_direct_profile_economic_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated')
    AND (
      NEW.balance IS DISTINCT FROM OLD.balance
      OR NEW.free_boosters_used IS DISTINCT FROM OLD.free_boosters_used
      OR NEW.free_boosters_day IS DISTINCT FROM OLD.free_boosters_day
    )
  THEN
    RAISE EXCEPTION 'Les champs économiques du profil ne peuvent être modifiés que par les fonctions du serveur';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_direct_profile_economic_updates ON public.profiles;
CREATE TRIGGER prevent_direct_profile_economic_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_direct_profile_economic_updates();

DROP POLICY IF EXISTS "god_admins_admin_read" ON public.god_admins;
CREATE POLICY "god_admins_admin_read"
  ON public.god_admins
  FOR SELECT
  TO authenticated
  USING (public.is_god_admin());
GRANT SELECT ON public.god_admins TO authenticated;

DROP POLICY IF EXISTS "player_rarity_drop_rates_admin_read" ON public.player_rarity_drop_rates;
CREATE POLICY "player_rarity_drop_rates_admin_read"
  ON public.player_rarity_drop_rates
  FOR SELECT
  TO authenticated
  USING (public.is_god_admin());
GRANT SELECT ON public.player_rarity_drop_rates TO authenticated;

DROP POLICY IF EXISTS "god_mode_audit_admin_read" ON public.god_mode_audit;
CREATE POLICY "god_mode_audit_admin_read"
  ON public.god_mode_audit
  FOR SELECT
  TO authenticated
  USING (public.is_god_admin());
GRANT SELECT ON public.god_mode_audit TO authenticated;
