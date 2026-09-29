CREATE OR REPLACE FUNCTION public.random_rarity()
 RETURNS public.card_rarity
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE r NUMERIC := random();
BEGIN
  IF r < 0.48 THEN RETURN 'commune';
  ELSIF r < 0.75 THEN RETURN 'peu_commune';
  ELSIF r < 0.90 THEN RETURN 'rare';
  ELSIF r < 0.972 THEN RETURN 'epique';
  ELSIF r < 0.996 THEN RETURN 'legendaire';
  ELSE RETURN 'mythique'; END IF;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.random_rarity() FROM PUBLIC, anon, authenticated;