ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS free_boosters_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS free_boosters_day DATE;

-- Les joueurs ne peuvent modifier que leur pseudo (pas le solde ni les compteurs)
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (username) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.open_free_booster()
RETURNS TABLE(user_card_id uuid, card_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_user UUID := auth.uid(); v_today DATE := (now() AT TIME ZONE 'Europe/Paris')::date;
  i INT; r public.card_rarity; c public.cards%ROWTYPE; uc UUID;
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
    r := public.random_rarity();
    SELECT * INTO c FROM public.cards WHERE rarity = r ORDER BY random() LIMIT 1;
    IF c.id IS NULL THEN SELECT * INTO c FROM public.cards ORDER BY random() LIMIT 1; END IF;
    IF c.id IS NULL THEN RAISE EXCEPTION 'Catalogue vide'; END IF;
    INSERT INTO public.user_cards (user_id, card_id) VALUES (v_user, c.id) RETURNING id INTO uc;
    user_card_id := uc; card_id := c.id; RETURN NEXT;
  END LOOP;
END; $$;

REVOKE EXECUTE ON FUNCTION public.open_free_booster() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_free_booster() TO authenticated;