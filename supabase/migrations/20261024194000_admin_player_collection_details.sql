CREATE OR REPLACE FUNCTION public.admin_player_collection_breakdown(p_user_id UUID)
RETURNS TABLE(
  category_type TEXT,
  category_name TEXT,
  catalog_cards BIGINT,
  owned_unique BIGINT,
  owned_total BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_god_admin() THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Choisissez un joueur'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Joueur introuvable';
  END IF;

  RETURN QUERY
  WITH categories AS (
    SELECT 'Rareté'::TEXT AS category_type, c.rarity::TEXT AS category_name, c.id
    FROM public.cards c
    UNION ALL
    SELECT 'Cercle juridique'::TEXT, COALESCE(c.circle, 'france'), c.id
    FROM public.cards c
    UNION ALL
    SELECT 'Type de carte'::TEXT, COALESCE(NULLIF(c.category, ''), 'Autre'), c.id
    FROM public.cards c
  ),
  owned AS (
    SELECT uc.card_id, count(*) AS copies
    FROM public.user_cards uc
    WHERE uc.user_id = p_user_id AND uc.revoked_at IS NULL
    GROUP BY uc.card_id
  )
  SELECT
    c.category_type,
    c.category_name,
    count(DISTINCT c.id),
    count(DISTINCT c.id) FILTER (WHERE o.card_id IS NOT NULL),
    COALESCE(sum(o.copies), 0)::BIGINT
  FROM categories c
  LEFT JOIN owned o ON o.card_id = c.id
  GROUP BY c.category_type, c.category_name
  ORDER BY c.category_type, c.category_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_missing_player_cards(
  p_user_id UUID,
  p_query TEXT DEFAULT '',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  card_id UUID,
  title TEXT,
  ref TEXT,
  rarity public.card_rarity,
  circle TEXT,
  category TEXT,
  total_missing BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_query TEXT := btrim(COALESCE(p_query, ''));
BEGIN
  IF NOT public.is_god_admin() THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Choisissez un joueur'; END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 OR p_offset IS NULL OR p_offset < 0 THEN
    RAISE EXCEPTION 'Pagination invalide';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Joueur introuvable';
  END IF;

  RETURN QUERY
  SELECT c.id, c.title, c.ref, c.rarity, c.circle, c.category, count(*) OVER ()
  FROM public.cards c
  WHERE NOT EXISTS (
      SELECT 1 FROM public.user_cards uc
      WHERE uc.user_id = p_user_id AND uc.card_id = c.id AND uc.revoked_at IS NULL
    )
    AND (
      v_query = ''
      OR c.title ILIKE '%' || v_query || '%'
      OR c.ref ILIKE '%' || v_query || '%'
    )
  ORDER BY c.title, c.id
  LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_player_collection_breakdown(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_missing_player_cards(UUID, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_player_collection_breakdown(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_missing_player_cards(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
