CREATE TABLE IF NOT EXISTS public.god_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.god_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.god_admins FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.god_admins TO service_role;

CREATE TABLE IF NOT EXISTS public.god_mode_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID,
  reason TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.god_mode_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.god_mode_audit FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.god_mode_audit TO service_role;

ALTER TABLE public.user_cards
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revocation_reason TEXT;

CREATE TABLE IF NOT EXISTS public.booster_draws (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_card_id UUID REFERENCES public.user_cards(id) ON DELETE SET NULL,
  drawer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  drawn_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booster_draws_drawn_at_idx ON public.booster_draws(drawn_at DESC);
CREATE INDEX IF NOT EXISTS booster_draws_user_drawn_at_idx ON public.booster_draws(drawer_user_id, drawn_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS booster_draws_user_card_uidx ON public.booster_draws(user_card_id);
ALTER TABLE public.booster_draws ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booster_draws FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.booster_draws TO authenticated;
GRANT ALL ON public.booster_draws TO service_role;

CREATE OR REPLACE FUNCTION public.is_god_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.god_admins WHERE user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_god_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_god_admin() TO authenticated;

CREATE POLICY "booster_draws_admin_read" ON public.booster_draws
  FOR SELECT TO authenticated
  USING (public.is_god_admin());

CREATE OR REPLACE FUNCTION public.record_booster_draw()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.booster_draws (user_card_id, drawer_user_id, card_id, drawn_at)
  VALUES (NEW.id, NEW.user_id, NEW.card_id, COALESCE(NEW.acquired_at, now()));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_cards_record_booster_draw ON public.user_cards;
CREATE TRIGGER user_cards_record_booster_draw
  AFTER INSERT ON public.user_cards
  FOR EACH ROW EXECUTE FUNCTION public.record_booster_draw();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'booster_draws'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.booster_draws;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_search_players(p_query TEXT)
RETURNS TABLE(user_id UUID, username TEXT, balance INTEGER, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_god_admin() THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;
  IF p_query IS NULL OR length(btrim(p_query)) < 2 THEN
    RAISE EXCEPTION 'Saisissez au moins deux caractères';
  END IF;

  RETURN QUERY
  SELECT p.id, p.username, p.balance, p.created_at
  FROM public.profiles p
  WHERE p.username ILIKE '%' || btrim(p_query) || '%'
  ORDER BY p.username
  LIMIT 50;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
  p_user_id UUID,
  p_delta INTEGER,
  p_reason TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_balance INTEGER;
BEGIN
  IF NOT public.is_god_admin() THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;
  IF p_delta IS NULL OR p_delta = 0 OR abs(p_delta::BIGINT) > 1000000 THEN
    RAISE EXCEPTION 'Ajustement invalide (maximum : 1 000 000 Deniers)';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 3 OR length(btrim(p_reason)) > 300 THEN
    RAISE EXCEPTION 'Un motif de 3 à 300 caractères est obligatoire';
  END IF;

  UPDATE public.profiles
  SET balance = balance + p_delta
  WHERE id = p_user_id AND balance + p_delta >= 0
  RETURNING balance INTO v_balance;
  IF NOT FOUND THEN RAISE EXCEPTION 'Joueur introuvable ou solde insuffisant pour ce retrait'; END IF;

  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES (p_user_id, 'admin', p_delta, 'Ajustement administrateur : ' || btrim(p_reason));
  INSERT INTO public.god_mode_audit (actor_user_id, action, target_user_id, reason, details)
  VALUES (v_actor, 'balance_adjustment', p_user_id, btrim(p_reason),
          jsonb_build_object('delta', p_delta, 'new_balance', v_balance));
  RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_card(p_user_card_id UUID, p_reason TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_owner UUID;
  v_listing_count INTEGER;
BEGIN
  IF NOT public.is_god_admin() THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 3 OR length(btrim(p_reason)) > 300 THEN
    RAISE EXCEPTION 'Un motif de 3 à 300 caractères est obligatoire';
  END IF;

  SELECT user_id INTO v_owner
  FROM public.user_cards
  WHERE id = p_user_card_id AND revoked_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Carte introuvable ou déjà retirée'; END IF;

  UPDATE public.listings
  SET status = 'cancelled'
  WHERE user_card_id = p_user_card_id AND status = 'active';
  GET DIAGNOSTICS v_listing_count = ROW_COUNT;

  UPDATE public.user_cards
  SET revoked_at = now(), revoked_by = v_actor, revocation_reason = btrim(p_reason)
  WHERE id = p_user_card_id;

  INSERT INTO public.god_mode_audit (actor_user_id, action, target_user_id, reason, details)
  VALUES (v_actor, 'card_revoked', v_owner, btrim(p_reason),
          jsonb_build_object('user_card_id', p_user_card_id, 'cancelled_listings', v_listing_count));
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_recent_draws(p_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  draw_id BIGINT,
  user_card_id UUID,
  drawer_user_id UUID,
  drawer_username TEXT,
  current_owner_id UUID,
  current_owner_username TEXT,
  card_id UUID,
  card_title TEXT,
  rarity public.card_rarity,
  drawn_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_god_admin() THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;

  RETURN QUERY
  SELECT d.id, d.user_card_id, d.drawer_user_id, drawer.username,
         uc.user_id, owner.username, c.id, c.title, c.rarity, d.drawn_at, uc.revoked_at
  FROM public.booster_draws d
  LEFT JOIN public.profiles drawer ON drawer.id = d.drawer_user_id
  LEFT JOIN public.cards c ON c.id = d.card_id
  LEFT JOIN public.user_cards uc ON uc.id = d.user_card_id
  LEFT JOIN public.profiles owner ON owner.id = uc.user_id
  WHERE p_user_id IS NULL OR d.drawer_user_id = p_user_id OR uc.user_id = p_user_id
  ORDER BY d.drawn_at DESC
  LIMIT 200;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_player_cards(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  user_card_id UUID,
  card_id UUID,
  title TEXT,
  rarity public.card_rarity,
  base_value INTEGER,
  acquired_at TIMESTAMPTZ,
  listing_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_god_admin() THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Choisissez un joueur'; END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 OR p_offset IS NULL OR p_offset < 0 THEN
    RAISE EXCEPTION 'Pagination invalide';
  END IF;

  RETURN QUERY
  SELECT uc.id, c.id, c.title, c.rarity, c.base_value, uc.acquired_at,
         EXISTS (SELECT 1 FROM public.listings l WHERE l.user_card_id = uc.id AND l.status = 'active')
  FROM public.user_cards uc
  JOIN public.cards c ON c.id = uc.card_id
  WHERE uc.user_id = p_user_id AND uc.revoked_at IS NULL
  ORDER BY uc.acquired_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_market_history(p_user_id UUID)
RETURNS TABLE(
  listing_id UUID,
  card_title TEXT,
  seller_id UUID,
  seller_username TEXT,
  buyer_id UUID,
  buyer_username TEXT,
  price INTEGER,
  sold_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_god_admin() THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Choisissez un joueur'; END IF;

  RETURN QUERY
  SELECT l.id, c.title, l.seller_id, seller.username, l.buyer_id, buyer.username, l.price, l.sold_at
  FROM public.listings l
  JOIN public.cards c ON c.id = l.card_id
  JOIN public.profiles seller ON seller.id = l.seller_id
  LEFT JOIN public.profiles buyer ON buyer.id = l.buyer_id
  WHERE l.status = 'sold' AND (l.seller_id = p_user_id OR l.buyer_id = p_user_id)
  ORDER BY l.sold_at DESC NULLS LAST
  LIMIT 500;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_recent_audit()
RETURNS TABLE(
  audit_id BIGINT,
  actor_user_id UUID,
  action TEXT,
  target_user_id UUID,
  target_username TEXT,
  reason TEXT,
  details JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_god_admin() THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;

  RETURN QUERY
  SELECT a.id, a.actor_user_id, a.action, a.target_user_id, p.username,
         a.reason, a.details, a.created_at
  FROM public.god_mode_audit a
  LEFT JOIN public.profiles p ON p.id = a.target_user_id
  ORDER BY a.created_at DESC
  LIMIT 100;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_preview_rollback(p_window_minutes INTEGER)
RETURNS TABLE(cards_to_revoke BIGINT, listings_to_cancel BIGINT, discoveries_to_reset BIGINT, players_affected BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
BEGIN
  IF NOT public.is_god_admin() THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;
  IF p_window_minutes NOT IN (30, 120, 1440) THEN RAISE EXCEPTION 'Fenêtre de rollback invalide'; END IF;
  v_cutoff := now() - make_interval(mins => p_window_minutes);

  RETURN QUERY
  WITH draws AS (
    SELECT d.user_card_id, uc.user_id
    FROM public.booster_draws d
    JOIN public.user_cards uc ON uc.id = d.user_card_id
    WHERE d.drawn_at >= v_cutoff AND d.drawn_at <= now() AND uc.revoked_at IS NULL
  ),
  discovery_cards AS (
    SELECT c.id FROM public.cards c
    WHERE c.first_discovered_at >= v_cutoff AND c.first_discovered_at <= now()
  )
  SELECT
    (SELECT count(*) FROM draws),
    (SELECT count(*) FROM public.listings l JOIN draws d ON d.user_card_id = l.user_card_id WHERE l.status = 'active'),
    (SELECT count(*) FROM discovery_cards),
    (SELECT count(DISTINCT user_id) FROM draws);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_apply_rollback(p_window_minutes INTEGER, p_reason TEXT)
RETURNS TABLE(cards_revoked BIGINT, listings_cancelled BIGINT, discoveries_reset BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_cutoff TIMESTAMPTZ;
  v_cards BIGINT;
  v_listings BIGINT;
  v_discoveries BIGINT;
BEGIN
  IF NOT public.is_god_admin() THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;
  IF p_window_minutes NOT IN (30, 120, 1440) THEN RAISE EXCEPTION 'Fenêtre de rollback invalide'; END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 3 OR length(btrim(p_reason)) > 300 THEN
    RAISE EXCEPTION 'Un motif de 3 à 300 caractères est obligatoire';
  END IF;
  v_cutoff := now() - make_interval(mins => p_window_minutes);

  UPDATE public.listings l
  SET status = 'cancelled'
  WHERE l.status = 'active'
    AND EXISTS (
      SELECT 1
      FROM public.booster_draws d
      JOIN public.user_cards uc ON uc.id = d.user_card_id
      WHERE d.user_card_id = l.user_card_id
        AND d.drawn_at >= v_cutoff AND d.drawn_at <= now()
        AND uc.revoked_at IS NULL
    );
  GET DIAGNOSTICS v_listings = ROW_COUNT;

  UPDATE public.user_cards uc
  SET revoked_at = now(), revoked_by = v_actor, revocation_reason = btrim(p_reason)
  WHERE uc.revoked_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.booster_draws d
      WHERE d.user_card_id = uc.id
        AND d.drawn_at >= v_cutoff AND d.drawn_at <= now()
    );
  GET DIAGNOSTICS v_cards = ROW_COUNT;

  UPDATE public.cards
  SET first_discovered_by = NULL, first_discovered_at = NULL
  WHERE first_discovered_at >= v_cutoff AND first_discovered_at <= now();
  GET DIAGNOSTICS v_discoveries = ROW_COUNT;

  INSERT INTO public.god_mode_audit (actor_user_id, action, reason, details)
  VALUES (
    v_actor, 'time_window_rollback', btrim(p_reason),
    jsonb_build_object(
      'window_minutes', p_window_minutes,
      'cutoff', v_cutoff,
      'cards_revoked', v_cards,
      'listings_cancelled', v_listings,
      'discoveries_reset', v_discoveries,
      'completed_sales_and_balances_untouched', TRUE
    )
  );

  RETURN QUERY SELECT v_cards, v_listings, v_discoveries;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_search_players(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_adjust_balance(UUID, INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_revoke_card(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_recent_draws(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_player_cards(UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_market_history(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_recent_audit() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_preview_rollback(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_apply_rollback(INTEGER, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_search_players(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_balance(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_card(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_recent_draws(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_player_cards(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_market_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_recent_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_preview_rollback(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_apply_rollback(INTEGER, TEXT) TO authenticated;
