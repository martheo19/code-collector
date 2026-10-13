ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS first_discovered_by uuid, ADD COLUMN IF NOT EXISTS first_discovered_at timestamptz;
CREATE INDEX IF NOT EXISTS cards_rarity_idx ON public.cards(rarity);
CREATE INDEX IF NOT EXISTS cards_filters_idx ON public.cards(circle, rarity, status);
CREATE UNIQUE INDEX IF NOT EXISTS cards_ref_uidx ON public.cards(ref);

CREATE OR REPLACE FUNCTION public.draw_card(p_user uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.card_rarity; v_id uuid; v_n bigint;
BEGIN
  r := public.random_rarity();
  SELECT count(*) INTO v_n FROM public.cards WHERE rarity = r;
  IF v_n = 0 THEN SELECT count(*) INTO v_n FROM public.cards; r := NULL; END IF;
  IF v_n = 0 THEN RAISE EXCEPTION 'Catalogue vide'; END IF;
  SELECT id INTO v_id FROM public.cards WHERE (r IS NULL OR rarity = r)
    OFFSET floor(random() * v_n)::bigint LIMIT 1;
  UPDATE public.cards SET first_discovered_by = p_user, first_discovered_at = now()
    WHERE id = v_id AND first_discovered_by IS NULL;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.draw_card(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.open_booster()
 RETURNS TABLE(user_card_id uuid, card_id uuid)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_user UUID := auth.uid(); v_cost INT := 150; i INT; v_card uuid; uc UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  UPDATE public.profiles SET balance = balance - v_cost WHERE id = v_user AND balance >= v_cost;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES (v_user, 'booster', -v_cost, 'Ouverture d''un booster');
  FOR i IN 1..3 LOOP
    v_card := public.draw_card(v_user);
    INSERT INTO public.user_cards (user_id, card_id) VALUES (v_user, v_card) RETURNING id INTO uc;
    user_card_id := uc; card_id := v_card; RETURN NEXT;
  END LOOP;
END; $function$;

CREATE OR REPLACE FUNCTION public.open_free_booster()
 RETURNS TABLE(user_card_id uuid, card_id uuid)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
  FOR i IN 1..3 LOOP
    v_card := public.draw_card(v_user);
    INSERT INTO public.user_cards (user_id, card_id) VALUES (v_user, v_card) RETURNING id INTO uc;
    user_card_id := uc; card_id := v_card; RETURN NEXT;
  END LOOP;
END; $function$;

CREATE OR REPLACE FUNCTION public.cap_constit_rarity() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.authority = 'Conseil constitutionnel' AND NEW.rarity = 'mythique' THEN NEW.rarity := 'legendaire'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS cards_cap_constit ON public.cards;
CREATE TRIGGER cards_cap_constit BEFORE INSERT OR UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.cap_constit_rarity();