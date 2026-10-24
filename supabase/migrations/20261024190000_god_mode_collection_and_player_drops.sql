ALTER TABLE public.booster_draws
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'booster';

ALTER TABLE public.booster_draws
  DROP CONSTRAINT IF EXISTS booster_draws_source_check;
ALTER TABLE public.booster_draws
  ADD CONSTRAINT booster_draws_source_check CHECK (source IN ('booster', 'admin_grant'));

CREATE TABLE IF NOT EXISTS public.player_rarity_drop_rates (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  commune NUMERIC(5, 2) NOT NULL CHECK (commune >= 0 AND commune <= 100),
  peu_commune NUMERIC(5, 2) NOT NULL CHECK (peu_commune >= 0 AND peu_commune <= 100),
  rare NUMERIC(5, 2) NOT NULL CHECK (rare >= 0 AND rare <= 100),
  epique NUMERIC(5, 2) NOT NULL CHECK (epique >= 0 AND epique <= 100),
  legendaire NUMERIC(5, 2) NOT NULL CHECK (legendaire >= 0 AND legendaire <= 100),
  mythique NUMERIC(5, 2) NOT NULL CHECK (mythique >= 0 AND mythique <= 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT player_rarity_drop_rates_total_check
    CHECK (commune + peu_commune + rare + epique + legendaire + mythique = 100)
);

ALTER TABLE public.player_rarity_drop_rates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_rarity_drop_rates FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.player_rarity_drop_rates TO service_role;

CREATE OR REPLACE FUNCTION public.draw_card(p_user UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r public.card_rarity;
  v_id UUID;
  v_n BIGINT;
  v_roll NUMERIC;
  v_rates public.player_rarity_drop_rates%ROWTYPE;
BEGIN
  SELECT * INTO v_rates
  FROM public.player_rarity_drop_rates
  WHERE user_id = p_user;

  IF FOUND THEN
    v_roll := random() * 100;
    IF v_roll < v_rates.commune THEN
      r := 'commune';
    ELSIF v_roll < v_rates.commune + v_rates.peu_commune THEN
      r := 'peu_commune';
    ELSIF v_roll < v_rates.commune + v_rates.peu_commune + v_rates.rare THEN
      r := 'rare';
    ELSIF v_roll < v_rates.commune + v_rates.peu_commune + v_rates.rare + v_rates.epique THEN
      r := 'epique';
    ELSIF v_roll < v_rates.commune + v_rates.peu_commune + v_rates.rare
                    + v_rates.epique + v_rates.legendaire THEN
      r := 'legendaire';
    ELSE
      r := 'mythique';
    END IF;
  ELSE
    r := public.random_rarity();
  END IF;

  SELECT count(*) INTO v_n FROM public.cards WHERE rarity = r;
  IF v_n = 0 THEN
    SELECT count(*) INTO v_n FROM public.cards;
    r := NULL;
  END IF;
  IF v_n = 0 THEN RAISE EXCEPTION 'Catalogue vide'; END IF;

  SELECT id INTO v_id
  FROM public.cards
  WHERE r IS NULL OR rarity = r
  OFFSET floor(random() * v_n)::BIGINT
  LIMIT 1;

  UPDATE public.cards
  SET first_discovered_by = p_user, first_discovered_at = now()
  WHERE id = v_id AND first_discovered_by IS NULL;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_player_collection_stats(p_user_id UUID)
RETURNS TABLE(catalog_cards BIGINT, owned_cards BIGINT, unique_cards BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_god_admin() THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Choisissez un joueur'; END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.cards),
    (SELECT count(*) FROM public.user_cards WHERE user_id = p_user_id AND revoked_at IS NULL),
    (SELECT count(DISTINCT card_id) FROM public.user_cards
     WHERE user_id = p_user_id AND revoked_at IS NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_card(
  p_user_id UUID,
  p_card_id UUID,
  p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_user_card_id UUID;
  v_owned BIGINT;
  v_title TEXT;
BEGIN
  IF NOT public.is_god_admin() THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;
  IF p_user_id IS NULL OR p_card_id IS NULL THEN RAISE EXCEPTION 'Joueur et carte requis'; END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 3 OR length(btrim(p_reason)) > 300 THEN
    RAISE EXCEPTION 'Un motif de 3 à 300 caractères est obligatoire';
  END IF;

  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Joueur introuvable'; END IF;
  SELECT title INTO v_title FROM public.cards WHERE id = p_card_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Carte introuvable dans le catalogue'; END IF;

  SELECT count(*) INTO v_owned
  FROM public.user_cards
  WHERE user_id = p_user_id AND revoked_at IS NULL;
  IF v_owned >= 20000 THEN
    RAISE EXCEPTION 'La collection du joueur a atteint la limite de 20 000 cartes';
  END IF;

  INSERT INTO public.user_cards (user_id, card_id)
  VALUES (p_user_id, p_card_id)
  RETURNING id INTO v_user_card_id;

  UPDATE public.booster_draws
  SET source = 'admin_grant'
  WHERE user_card_id = v_user_card_id;

  INSERT INTO public.god_mode_audit (actor_user_id, action, target_user_id, reason, details)
  VALUES (
    v_actor,
    'card_granted',
    p_user_id,
    btrim(p_reason),
    jsonb_build_object('user_card_id', v_user_card_id, 'card_id', p_card_id, 'card_title', v_title)
  );

  RETURN v_user_card_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_player_drop_rates(p_user_id UUID)
RETURNS TABLE(
  commune NUMERIC,
  peu_commune NUMERIC,
  rare NUMERIC,
  epique NUMERIC,
  legendaire NUMERIC,
  mythique NUMERIC,
  is_custom BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_god_admin() THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Choisissez un joueur'; END IF;

  RETURN QUERY
  SELECT r.commune::NUMERIC, r.peu_commune::NUMERIC, r.rare::NUMERIC,
         r.epique::NUMERIC, r.legendaire::NUMERIC, r.mythique::NUMERIC, TRUE
  FROM public.player_rarity_drop_rates r
  WHERE r.user_id = p_user_id
  UNION ALL
  SELECT 48::NUMERIC, 27::NUMERIC, 15::NUMERIC, 7.2::NUMERIC,
         2.4::NUMERIC, 0.4::NUMERIC, FALSE
  WHERE NOT EXISTS (
    SELECT 1 FROM public.player_rarity_drop_rates WHERE user_id = p_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_player_drop_rates(
  p_user_id UUID,
  p_commune NUMERIC,
  p_peu_commune NUMERIC,
  p_rare NUMERIC,
  p_epique NUMERIC,
  p_legendaire NUMERIC,
  p_mythique NUMERIC,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_god_admin() THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Choisissez un joueur'; END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 3 OR length(btrim(p_reason)) > 300 THEN
    RAISE EXCEPTION 'Un motif de 3 à 300 caractères est obligatoire';
  END IF;
  IF p_commune IS NULL OR p_peu_commune IS NULL OR p_rare IS NULL OR p_epique IS NULL
     OR p_legendaire IS NULL OR p_mythique IS NULL
     OR p_commune < 0 OR p_peu_commune < 0 OR p_rare < 0 OR p_epique < 0
     OR p_legendaire < 0 OR p_mythique < 0
     OR p_commune > 100 OR p_peu_commune > 100 OR p_rare > 100 OR p_epique > 100
     OR p_legendaire > 100 OR p_mythique > 100
     OR p_commune + p_peu_commune + p_rare + p_epique + p_legendaire + p_mythique <> 100 THEN
    RAISE EXCEPTION 'Les taux doivent être entre 0 et 100 et leur somme doit faire exactement 100 pour cent';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Joueur introuvable';
  END IF;

  INSERT INTO public.player_rarity_drop_rates (
    user_id, commune, peu_commune, rare, epique, legendaire, mythique, updated_at
  )
  VALUES (
    p_user_id, p_commune, p_peu_commune, p_rare, p_epique, p_legendaire, p_mythique, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    commune = EXCLUDED.commune,
    peu_commune = EXCLUDED.peu_commune,
    rare = EXCLUDED.rare,
    epique = EXCLUDED.epique,
    legendaire = EXCLUDED.legendaire,
    mythique = EXCLUDED.mythique,
    updated_at = now();

  INSERT INTO public.god_mode_audit (actor_user_id, action, target_user_id, reason, details)
  VALUES (
    auth.uid(),
    'player_drop_rates_changed',
    p_user_id,
    btrim(p_reason),
    jsonb_build_object(
      'commune', p_commune,
      'peu_commune', p_peu_commune,
      'rare', p_rare,
      'epique', p_epique,
      'legendaire', p_legendaire,
      'mythique', p_mythique
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_player_drop_rates(p_user_id UUID, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_god_admin() THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Choisissez un joueur'; END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 3 OR length(btrim(p_reason)) > 300 THEN
    RAISE EXCEPTION 'Un motif de 3 à 300 caractères est obligatoire';
  END IF;

  DELETE FROM public.player_rarity_drop_rates WHERE user_id = p_user_id;
  INSERT INTO public.god_mode_audit (actor_user_id, action, target_user_id, reason, details)
  VALUES (
    auth.uid(),
    'player_drop_rates_reset',
    p_user_id,
    btrim(p_reason),
    jsonb_build_object('uses_default_rates', TRUE)
  );
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
  WHERE d.source = 'booster'
    AND (p_user_id IS NULL OR d.drawer_user_id = p_user_id OR uc.user_id = p_user_id)
  ORDER BY d.drawn_at DESC
  LIMIT 200;
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
    WHERE d.source = 'booster'
      AND d.drawn_at >= v_cutoff AND d.drawn_at <= now() AND uc.revoked_at IS NULL
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
      WHERE d.user_card_id = l.user_card_id AND d.source = 'booster'
        AND d.drawn_at >= v_cutoff AND d.drawn_at <= now() AND uc.revoked_at IS NULL
    );
  GET DIAGNOSTICS v_listings = ROW_COUNT;

  UPDATE public.user_cards uc
  SET revoked_at = now(), revoked_by = v_actor, revocation_reason = btrim(p_reason)
  WHERE uc.revoked_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.booster_draws d
      WHERE d.user_card_id = uc.id AND d.source = 'booster'
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

REVOKE ALL ON FUNCTION public.admin_player_collection_stats(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_grant_card(UUID, UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_player_drop_rates(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_player_drop_rates(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reset_player_drop_rates(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_recent_draws(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_preview_rollback(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_apply_rollback(INTEGER, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_player_collection_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_card(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_player_drop_rates(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_player_drop_rates(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_player_drop_rates(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_recent_draws(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_preview_rollback(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_apply_rollback(INTEGER, TEXT) TO authenticated;
