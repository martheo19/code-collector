DROP FUNCTION IF EXISTS public.open_booster();

CREATE OR REPLACE FUNCTION public.open_booster(p_quantity INTEGER)
RETURNS TABLE(user_card_id UUID, card_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_cost INTEGER;
  v_card UUID;
  v_user_card UUID;
  v_pack INTEGER;
  v_card_number INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 20 THEN
    RAISE EXCEPTION 'Le nombre de packs doit être compris entre 1 et 20';
  END IF;

  v_cost := p_quantity * 150;
  UPDATE public.profiles
  SET balance = balance - v_cost
  WHERE id = v_user AND balance >= v_cost;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solde insuffisant';
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

REVOKE ALL ON FUNCTION public.open_booster(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_booster(INTEGER) TO authenticated;
