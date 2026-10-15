CREATE OR REPLACE FUNCTION public.open_booster()
 RETURNS TABLE(user_card_id uuid, card_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_user UUID := auth.uid(); v_cost INT := 150; i INT; v_card uuid; uc UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  UPDATE public.profiles SET balance = balance - v_cost WHERE id = v_user AND balance >= v_cost;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES (v_user, 'booster', -v_cost, 'Ouverture d''un booster');
  FOR i IN 1..5 LOOP
    v_card := public.draw_card(v_user);
    INSERT INTO public.user_cards (user_id, card_id) VALUES (v_user, v_card) RETURNING id INTO uc;
    user_card_id := uc; card_id := v_card; RETURN NEXT;
  END LOOP;
END; $function$;

CREATE OR REPLACE FUNCTION public.open_free_booster()
 RETURNS TABLE(user_card_id uuid, card_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_user UUID := auth.uid(); v_today DATE := (now() AT TIME ZONE 'Europe/Paris')::date;
  i INT; v_card uuid; uc UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  UPDATE public.profiles
     SET free_boosters_used = CASE WHEN free_boosters_day = v_today THEN free_boosters_used + 1 ELSE 1 END,
         free_boosters_day = v_today
   WHERE id = v_user AND (free_boosters_day IS DISTINCT FROM v_today OR free_boosters_used < 2);
  IF NOT FOUND THEN RAISE EXCEPTION 'Plus de booster gratuit aujourd''hui'; END IF;
  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES (v_user, 'booster', 0, 'Booster gratuit du jour');
  FOR i IN 1..5 LOOP
    v_card := public.draw_card(v_user);
    INSERT INTO public.user_cards (user_id, card_id) VALUES (v_user, v_card) RETURNING id INTO uc;
    user_card_id := uc; card_id := v_card; RETURN NEXT;
  END LOOP;
END; $function$;