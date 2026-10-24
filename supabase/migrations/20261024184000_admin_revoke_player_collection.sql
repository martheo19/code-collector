CREATE OR REPLACE FUNCTION public.admin_revoke_player_cards(
  p_user_id UUID,
  p_reason TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_revoked_count INTEGER;
  v_listing_count INTEGER;
BEGIN
  IF NOT public.is_god_admin() THEN
    RAISE EXCEPTION 'Accès administrateur requis';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Choisissez un joueur';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 3 OR length(btrim(p_reason)) > 300 THEN
    RAISE EXCEPTION 'Un motif de 3 à 300 caractères est obligatoire';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Joueur introuvable';
  END IF;

  UPDATE public.listings l
  SET status = 'cancelled'
  FROM public.user_cards uc
  WHERE uc.user_id = p_user_id
    AND uc.revoked_at IS NULL
    AND l.user_card_id = uc.id
    AND l.status = 'active';
  GET DIAGNOSTICS v_listing_count = ROW_COUNT;

  UPDATE public.user_cards
  SET revoked_at = now(),
      revoked_by = v_actor,
      revocation_reason = btrim(p_reason)
  WHERE user_id = p_user_id
    AND revoked_at IS NULL;
  GET DIAGNOSTICS v_revoked_count = ROW_COUNT;

  INSERT INTO public.god_mode_audit (actor_user_id, action, target_user_id, reason, details)
  VALUES (
    v_actor,
    'player_collection_revoked',
    p_user_id,
    btrim(p_reason),
    jsonb_build_object(
      'cards_revoked', v_revoked_count,
      'listings_cancelled', v_listing_count
    )
  );

  RETURN v_revoked_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_player_cards(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_player_cards(UUID, TEXT) TO authenticated;
