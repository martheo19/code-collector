CREATE OR REPLACE FUNCTION public.open_booster(p_quantity INTEGER)
RETURNS TABLE(user_card_id UUID, card_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_cost INTEGER;
  v_owned INTEGER;
  v_card UUID;
  v_user_card UUID;
  v_pack INTEGER;
  v_card_number INTEGER;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 20 THEN
    RAISE EXCEPTION 'Le nombre de packs doit être compris entre 1 et 20';
  END IF;

  v_cost := p_quantity * 150;
  UPDATE public.profiles
  SET balance = balance - v_cost
  WHERE id = v_user AND balance >= v_cost;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;

  SELECT count(*) INTO v_owned
  FROM public.user_cards
  WHERE user_id = v_user AND revoked_at IS NULL;
  IF v_owned + p_quantity * 5 > 20000 THEN
    RAISE EXCEPTION 'La collection est limitée à 20 000 cartes. Supprimez des cartes avant d''ouvrir ces packs.';
  END IF;

  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES (
    v_user,
    'booster',
    -v_cost,
    format('Ouverture de %s packs', p_quantity)
  );

  FOR v_pack IN 1..p_quantity LOOP
    FOR v_card_number IN 1..5 LOOP
      v_card := public.draw_card(v_user);
      INSERT INTO public.user_cards (user_id, card_id)
      VALUES (v_user, v_card)
      RETURNING id INTO v_user_card;
      user_card_id := v_user_card;
      card_id := v_card;
      RETURN NEXT;
    END LOOP;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.open_free_booster()
RETURNS TABLE(user_card_id UUID, card_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_today DATE := (now() AT TIME ZONE 'Europe/Paris')::DATE;
  v_owned INTEGER;
  v_card UUID;
  v_user_card UUID;
  v_card_number INTEGER;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;

  UPDATE public.profiles
  SET free_boosters_used =
        CASE WHEN free_boosters_day = v_today THEN free_boosters_used + 1 ELSE 1 END,
      free_boosters_day = v_today
  WHERE id = v_user
    AND (free_boosters_day IS DISTINCT FROM v_today OR free_boosters_used < 2);
  IF NOT FOUND THEN RAISE EXCEPTION 'Plus de booster gratuit aujourd''hui'; END IF;

  SELECT count(*) INTO v_owned
  FROM public.user_cards
  WHERE user_id = v_user AND revoked_at IS NULL;
  IF v_owned + 5 > 20000 THEN
    RAISE EXCEPTION 'La collection est limitée à 20 000 cartes. Supprimez des cartes avant d''ouvrir un booster.';
  END IF;

  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES (v_user, 'booster', 0, 'Booster gratuit du jour');

  FOR v_card_number IN 1..5 LOOP
    v_card := public.draw_card(v_user);
    INSERT INTO public.user_cards (user_id, card_id)
    VALUES (v_user, v_card)
    RETURNING id INTO v_user_card;
    user_card_id := v_user_card;
    card_id := v_card;
    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.buy_listing(p_listing_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user UUID := auth.uid();
  l public.listings%ROWTYPE;
  v_owned INTEGER;
  v_title TEXT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;

  SELECT * INTO l
  FROM public.listings
  WHERE id = p_listing_id AND status = 'active'
  FOR UPDATE;
  IF l.id IS NULL THEN RAISE EXCEPTION 'Annonce indisponible'; END IF;
  IF l.seller_id = v_user THEN RAISE EXCEPTION 'Vous ne pouvez pas acheter votre propre annonce'; END IF;

  UPDATE public.profiles
  SET balance = balance - l.price
  WHERE id = v_user AND balance >= l.price;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;

  SELECT count(*) INTO v_owned
  FROM public.user_cards
  WHERE user_id = v_user AND revoked_at IS NULL;
  IF v_owned >= 20000 THEN
    RAISE EXCEPTION 'La collection est limitée à 20 000 cartes. Supprimez une carte avant cet achat.';
  END IF;

  UPDATE public.profiles SET balance = balance + l.price WHERE id = l.seller_id;
  UPDATE public.user_cards
  SET user_id = v_user, acquired_at = now()
  WHERE id = l.user_card_id AND revoked_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'La carte de cette annonce n''est plus disponible'; END IF;

  UPDATE public.listings
  SET status = 'sold', buyer_id = v_user, sold_at = now()
  WHERE id = l.id;

  SELECT title INTO v_title FROM public.cards WHERE id = l.card_id;
  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES
    (v_user, 'achat', -l.price, 'Achat : ' || COALESCE(v_title, 'carte')),
    (l.seller_id, 'vente', l.price, 'Vente : ' || COALESCE(v_title, 'carte'));
END;
$$;

DROP FUNCTION IF EXISTS public.admin_player_cards(UUID);

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
         EXISTS (
           SELECT 1 FROM public.listings l
           WHERE l.user_card_id = uc.id AND l.status = 'active'
         )
  FROM public.user_cards uc
  JOIN public.cards c ON c.id = uc.card_id
  WHERE uc.user_id = p_user_id AND uc.revoked_at IS NULL
  ORDER BY uc.acquired_at DESC, uc.id
  LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.open_booster(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_booster(INTEGER) TO authenticated;
REVOKE ALL ON FUNCTION public.open_free_booster() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_free_booster() TO authenticated;
REVOKE ALL ON FUNCTION public.buy_listing(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buy_listing(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_player_cards(UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_player_cards(UUID, INTEGER, INTEGER) TO authenticated;
