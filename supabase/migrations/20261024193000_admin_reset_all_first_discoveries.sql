CREATE OR REPLACE FUNCTION public.admin_reset_all_first_discoveries(p_reason TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_reset_count BIGINT;
BEGIN
  IF NOT public.is_god_admin() THEN
    RAISE EXCEPTION 'Accès administrateur requis';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 3 OR length(btrim(p_reason)) > 300 THEN
    RAISE EXCEPTION 'Un motif de 3 à 300 caractères est obligatoire';
  END IF;

  UPDATE public.cards
  SET first_discovered_by = NULL,
      first_discovered_at = NULL
  WHERE first_discovered_by IS NOT NULL
     OR first_discovered_at IS NOT NULL;
  GET DIAGNOSTICS v_reset_count = ROW_COUNT;

  INSERT INTO public.god_mode_audit (actor_user_id, action, reason, details)
  VALUES (
    v_actor,
    'all_first_discoveries_reset',
    btrim(p_reason),
    jsonb_build_object('discoveries_reset', v_reset_count)
  );

  RETURN v_reset_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_all_first_discoveries(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_all_first_discoveries(TEXT) TO authenticated;
